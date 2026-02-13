use std::{
    collections::{HashMap, HashSet},
    fs,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use anyhow::{Context, Result, anyhow};
use axum::{Json, Router, extract::{Path as AxumPath, Query, State}, http::StatusCode, response::IntoResponse, routing::{delete, get, post}};
use clap::{Args, Parser, Subcommand};
use futures::StreamExt;
use gridspeak_core::{Attachment, ChatMessage, ChatStore, NodeConfig, load_or_create_config};
use libp2p::{
    Multiaddr, PeerId, Swarm, SwarmBuilder, gossipsub, identify, identity, mdns, noise,
    swarm::SwarmEvent, tcp, yamux,
};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::{
    io::{self, AsyncBufReadExt, BufReader},
    net::TcpListener,
    sync::mpsc,
};
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

#[derive(Parser, Debug)]
#[command(author, version, about = "GridSpeak mesh node", long_about = None)]
struct Cli {
    /// Optional path to a config file. Defaults to $XDG_DATA_HOME/gridspeak/gridspeak.toml
    #[arg(long)]
    config: Option<PathBuf>,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Runs the node and joins the gossip mesh.
    Run(RunCommand),
    /// Prints the loaded configuration to stdout.
    PrintConfig,
}

#[derive(Debug, Args, Clone, Default)]
struct RunCommand {
    /// Multaddr (e.g. /ip4/0.0.0.0/tcp/7000) to listen on.
    #[arg(long)]
    listen: Option<String>,
    /// Override the topic name declared in the config file.
    #[arg(long)]
    topic: Option<String>,
    /// Bind target for the REST API (set to empty to disable).
    #[arg(long, default_value = "127.0.0.1:7070")]
    api_bind: String,
}

#[derive(libp2p::swarm::NetworkBehaviour)]
#[behaviour(out_event = "GridEvent", prelude = "libp2p::swarm::derive_prelude")]
struct GridBehaviour {
    gossipsub: gossipsub::Behaviour,
    mdns: mdns::tokio::Behaviour,
    identify: identify::Behaviour,
}

#[allow(clippy::large_enum_variant)]
enum GridEvent {
    Gossipsub(gossipsub::Event),
    Mdns(mdns::Event),
    Identify(identify::Event),
}

impl From<gossipsub::Event> for GridEvent {
    fn from(event: gossipsub::Event) -> Self {
        GridEvent::Gossipsub(event)
    }
}

impl From<mdns::Event> for GridEvent {
    fn from(event: mdns::Event) -> Self {
        GridEvent::Mdns(event)
    }
}

impl From<identify::Event> for GridEvent {
    fn from(event: identify::Event) -> Self {
        GridEvent::Identify(event)
    }
}

/// WebRTC signaling message (offer/answer/ICE) broadcast over gossip for voice/video.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSignal {
    pub from: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<String>,
    #[serde(rename = "type")]
    pub kind: String, // "offer" | "answer" | "ice"
    pub data: String,
}

/// API request: send a message to a channel, broadcast channel list, or broadcast channel removed.
pub enum ApiRequest {
    SendMessage { channel: String, message: ChatMessage },
    BroadcastChannelList,
    BroadcastChannelRemoved(String),
}

/// Per-channel message stores and channel list (synced via gossip).
#[derive(Clone)]
struct ChannelState {
    data_dir: PathBuf,
    config_path: PathBuf,
    channels: Arc<RwLock<Vec<String>>>,
    stores: Arc<RwLock<HashMap<String, Arc<ChatStore>>>>,
}

impl ChannelState {
    fn open(config: &NodeConfig, config_path: &Path) -> Result<Self> {
        let legacy = config.data_dir.join("messages.json");
        let general_path = config.data_dir.join("messages-general.json");
        if legacy.exists() && !general_path.exists() {
            fs::rename(&legacy, &general_path)?;
        }
        let mut stores = HashMap::new();
        for ch in &config.channels {
            let path = config.data_dir.join(format!("messages-{}.json", ch));
            stores.insert(ch.clone(), Arc::new(ChatStore::open(path)?));
        }
        Ok(Self {
            data_dir: config.data_dir.clone(),
            config_path: config_path.to_path_buf(),
            channels: Arc::new(RwLock::new(config.channels.clone())),
            stores: Arc::new(RwLock::new(stores)),
        })
    }

    fn list(&self) -> Vec<String> {
        self.channels.read().clone()
    }

    fn messages(&self, channel: &str) -> Vec<ChatMessage> {
        self.stores
            .read()
            .get(channel)
            .map(|s| s.messages())
            .unwrap_or_default()
    }

    fn get_store(&self, channel: &str) -> Option<Arc<ChatStore>> {
        self.stores.read().get(channel).cloned()
    }

    fn add_channel_local(&self, name: &str) -> Result<()> {
        let name = name.trim().to_lowercase();
        if name.is_empty() || name.len() > 64 {
            return Err(anyhow!("invalid channel name"));
        }
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
            return Err(anyhow!("channel name must be alphanumeric, - or _"));
        }
        {
            let ch = self.channels.read();
            if ch.contains(&name) {
                return Ok(());
            }
        }
        let path = self.data_dir.join(format!("messages-{}.json", name));
        let store = Arc::new(ChatStore::open(path)?);
        {
            let mut stores = self.stores.write();
            stores.insert(name.clone(), store);
        }
        {
            let mut channels = self.channels.write();
            channels.push(name.clone());
        }
        let mut config = load_or_create_config(&self.config_path)?;
        config.add_channel(&name, &self.config_path)?;
        Ok(())
    }

    fn merge_channels_from_remote(&self, list: &[String]) {
        let mut channels = self.channels.write();
        let mut stores = self.stores.write();
        for name in list {
            if !channels.contains(name) {
                channels.push(name.clone());
                let path = self.data_dir.join(format!("messages-{}.json", name));
                if let Ok(store) = ChatStore::open(path) {
                    stores.insert(name.clone(), Arc::new(store));
                }
            }
        }
    }

    fn remove_channel_local(&self, name: &str) -> Result<()> {
        if name == "general" {
            return Err(anyhow!("cannot delete #general"));
        }
        self.remove_channel_in_memory(name);
        let mut config = load_or_create_config(&self.config_path)?;
        config.remove_channel(name, &self.config_path)?;
        Ok(())
    }

    fn remove_channel_in_memory(&self, name: &str) {
        let mut channels = self.channels.write();
        channels.retain(|c| c != name);
        let mut stores = self.stores.write();
        stores.remove(name);
    }

    fn append_message(&self, channel: &str, message: ChatMessage) -> Result<()> {
        if let Some(store) = self.stores.read().get(channel) {
            store.append(message)?;
        }
        Ok(())
    }
}

#[derive(Clone)]
struct ApiContext {
    channel_state: ChannelState,
    sender: mpsc::Sender<ApiRequest>,
    fallback_author: String,
    telemetry: Telemetry,
    peer_id: String,
    voice_tx: mpsc::Sender<VoiceSignal>,
    voice_signals: Arc<RwLock<Vec<VoiceSignal>>>,
}

#[derive(Clone, Default)]
struct Telemetry {
    peers: Arc<RwLock<HashSet<String>>>,
    last_message: Arc<RwLock<Option<String>>>,
}

impl Telemetry {
    fn note_peer_online(&self, peer: &PeerId) {
        self.peers.write().insert(peer.to_string());
    }

    fn note_peer_offline(&self, peer: &PeerId) {
        self.peers.write().remove(&peer.to_string());
    }

    fn note_message(&self, timestamp: String) {
        *self.last_message.write() = Some(timestamp);
    }

    fn snapshot(&self) -> TelemetrySnapshot {
        TelemetrySnapshot {
            peers: self.peers.read().iter().cloned().collect(),
            last_message: self.last_message.read().clone(),
        }
    }
}

struct TelemetrySnapshot {
    peers: Vec<String>,
    last_message: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .init();

    let cli = Cli::parse();
    let config_path = cli.config.unwrap_or_else(default_config_path);
    match cli
        .command
        .unwrap_or_else(|| Commands::Run(RunCommand::default()))
    {
        Commands::Run(run) => run_node(run, config_path).await,
        Commands::PrintConfig => {
            let cfg = load_or_create_config(&config_path)?;
            println!("{}", toml::to_string_pretty(&cfg)?);
            Ok(())
        }
    }
}

fn default_config_path() -> PathBuf {
    NodeConfig::config_file(&NodeConfig::default().data_dir)
}

async fn run_node(args: RunCommand, config_path: PathBuf) -> Result<()> {
    let RunCommand {
        listen,
        topic,
        api_bind,
    } = args;
    let config = load_or_create_config(&config_path)
        .with_context(|| format!("unable to load config {:?}", config_path))?;

    let listen_addr: Multiaddr = listen
        .as_deref()
        .unwrap_or("/ip4/0.0.0.0/tcp/0")
        .parse()
        .map_err(|e| anyhow!("invalid listen address: {e}"))?;

    let api_socket = {
        let trimmed = api_bind.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(
                trimmed
                    .parse::<SocketAddr>()
                    .map_err(|err| anyhow!("invalid API bind address: {err}"))?,
            )
        }
    };

    let topic_name = topic.unwrap_or(config.topic.clone());
    let topic = gossipsub::IdentTopic::new(topic_name.clone());

    let config_path = config_path.clone();
    let channel_state = ChannelState::open(&config, &config_path)?;

    let telemetry = Telemetry::default();

    let identity_path = config.data_dir.join("identity.bin");
    let local_key = load_or_create_identity(&identity_path)?;
    let local_peer_id = PeerId::from(local_key.public());
    info!(%local_peer_id, "node identity loaded");

    let (api_tx, mut api_rx) = mpsc::channel::<ApiRequest>(32);
    let (voice_tx, mut voice_rx) = mpsc::channel::<VoiceSignal>(64);
    let voice_signals: Arc<RwLock<Vec<VoiceSignal>>> = Arc::new(RwLock::new(Vec::new()));
    const MAX_VOICE_SIGNALS: usize = 200;
    let mut api_enabled = false;
    if let Some(bind) = api_socket {
        api_enabled = true;
        let api_state = ApiContext {
            channel_state: channel_state.clone(),
            sender: api_tx.clone(),
            fallback_author: config.nickname.clone(),
            telemetry: telemetry.clone(),
            peer_id: local_peer_id.to_string(),
            voice_tx: voice_tx.clone(),
            voice_signals: voice_signals.clone(),
        };
        tokio::spawn(async move {
            if let Err(err) = serve_api(bind, api_state).await {
                warn!(%err, "api server stopped");
            }
        });
        info!(%bind, "api server listening");
    }

    let mut swarm = build_swarm(local_key, topic.clone()).await?;
    swarm.listen_on(listen_addr)?;

    for addr in &config.bootstrap_nodes {
        match addr.parse::<Multiaddr>() {
            Ok(multiaddr) => {
                if let Err(err) = swarm.dial(multiaddr.clone()) {
                    warn!(%multiaddr, %err, "failed to dial bootstrap node");
                }
            }
            Err(err) => warn!(%addr, %err, "invalid bootstrap address"),
        }
    }

    let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(16);
    tokio::spawn(read_stdin(stdin_tx));
    let mut shutdown = Box::pin(tokio::signal::ctrl_c());
    let mut stdin_done = false;

    loop {
        tokio::select! {
            line = stdin_rx.recv(), if !stdin_done => {
                if let Some(line) = line {
                    if let Some(store) = channel_state.get_store("general") {
                        if let Err(err) = publish_line(&line, &config.nickname, &store, "general", &topic, &mut swarm, &telemetry) {
                            warn!(%err, "failed to send message");
                        }
                    }
                } else {
                    stdin_done = true;
                    info!("stdin closed; node continues (API and P2P active)");
                }
            }
            event = swarm.select_next_some() => {
                handle_swarm_event(&mut swarm, event, channel_state.clone(), telemetry.clone(), voice_signals.clone(), local_peer_id, MAX_VOICE_SIGNALS);
            }
            voice_signal = voice_rx.recv(), if api_enabled => {
                if let Some(sig) = voice_signal {
                    if let Err(err) = publish_voice_signal(sig, &topic, &mut swarm) {
                        warn!(%err, "failed to publish voice signal");
                    }
                }
            }
            api_request = api_rx.recv(), if api_enabled => {
                match api_request {
                    Some(ApiRequest::SendMessage { channel, message }) => {
                        let author = message.author.clone();
                        if let Err(err) = publish_chat_message(&channel, message, &channel_state, &topic, &mut swarm, &telemetry) {
                            warn!(%err, "failed to relay api message");
                        } else {
                            info!(%author, %channel, "api message relayed");
                        }
                    }
                    Some(ApiRequest::BroadcastChannelList) => {
                        let list = channel_state.list();
                        if let Err(err) = publish_channel_list(&list, &topic, &mut swarm) {
                            warn!(%err, "failed to broadcast channel list");
                        }
                    }
                    Some(ApiRequest::BroadcastChannelRemoved(name)) => {
                        if let Err(err) = publish_channel_removed(&name, &topic, &mut swarm) {
                            warn!(%err, "failed to broadcast channel removed");
                        }
                    }
                    None => {
                        api_enabled = false;
                        warn!("api channel closed");
                    }
                }
            }
            result = &mut shutdown => {
                if let Err(err) = result {
                    warn!(%err, "ctrl+c listener failed");
                }
                info!("shutdown requested");
                break;
            }
        }
    }

    Ok(())
}

fn publish_line(
    line: &str,
    nickname: &str,
    store: &Arc<ChatStore>,
    channel: &str,
    topic: &gossipsub::IdentTopic,
    swarm: &mut Swarm<GridBehaviour>,
    telemetry: &Telemetry,
) -> Result<()> {
    if line.trim().is_empty() {
        return Ok(());
    }
    let message = ChatMessage::new(nickname.to_string(), line.to_owned());
    let envelope = serde_json::json!({ "channel": channel, "message": message });
    let bytes = serde_json::to_vec(&envelope)?;
    store.append(message.clone())?;
    swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes)?;
    telemetry.note_message(message.timestamp.to_rfc3339());
    println!("[{}] you :: {}", channel, message.body);
    Ok(())
}

fn publish_chat_message(
    channel: &str,
    message: ChatMessage,
    channel_state: &ChannelState,
    topic: &gossipsub::IdentTopic,
    swarm: &mut Swarm<GridBehaviour>,
    telemetry: &Telemetry,
) -> Result<()> {
    channel_state.append_message(channel, message.clone())?;
    let envelope = serde_json::json!({ "channel": channel, "message": message });
    let bytes = serde_json::to_vec(&envelope)?;
    swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes)?;
    telemetry.note_message(message.timestamp.to_rfc3339());
    Ok(())
}

fn publish_channel_list(
    list: &[String],
    topic: &gossipsub::IdentTopic,
    swarm: &mut Swarm<GridBehaviour>,
) -> Result<()> {
    let envelope = serde_json::json!({ "channel_list": list });
    let bytes = serde_json::to_vec(&envelope)?;
    swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes)?;
    Ok(())
}

fn publish_channel_removed(
    name: &str,
    topic: &gossipsub::IdentTopic,
    swarm: &mut Swarm<GridBehaviour>,
) -> Result<()> {
    let envelope = serde_json::json!({ "channel_removed": name });
    let bytes = serde_json::to_vec(&envelope)?;
    swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes)?;
    Ok(())
}

async fn build_swarm(
    local_key: identity::Keypair,
    topic: gossipsub::IdentTopic,
) -> Result<Swarm<GridBehaviour>> {
    let msg_auth = gossipsub::MessageAuthenticity::Signed(local_key.clone());
    let gossip_config = gossipsub::ConfigBuilder::default()
        .validation_mode(gossipsub::ValidationMode::Permissive)
        .heartbeat_interval(Duration::from_secs(1))
        .build()?;
    let mut gossipsub = gossipsub::Behaviour::new(msg_auth, gossip_config)
        .map_err(|err| anyhow::Error::msg(err.to_string()))?;
    gossipsub.subscribe(&topic)?;

    let mdns =
        mdns::tokio::Behaviour::new(mdns::Config::default(), PeerId::from(local_key.public()))?;
    let identify = identify::Behaviour::new(identify::Config::new(
        "/gridspeak/0.1.0".into(),
        local_key.public(),
    ));

    let behaviour = GridBehaviour {
        gossipsub,
        mdns,
        identify,
    };

    let swarm = SwarmBuilder::with_existing_identity(local_key)
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_behaviour(|_| behaviour)?
        .build();

    Ok(swarm)
}

fn publish_voice_signal(
    signal: VoiceSignal,
    topic: &gossipsub::IdentTopic,
    swarm: &mut Swarm<GridBehaviour>,
) -> Result<()> {
    let envelope = serde_json::json!({ "voice_signal": signal });
    let bytes = serde_json::to_vec(&envelope)?;
    swarm.behaviour_mut().gossipsub.publish(topic.clone(), bytes)?;
    Ok(())
}

fn handle_swarm_event(
    swarm: &mut Swarm<GridBehaviour>,
    event: SwarmEvent<GridEvent>,
    channel_state: ChannelState,
    telemetry: Telemetry,
    voice_signals: Arc<RwLock<Vec<VoiceSignal>>>,
    local_peer_id: PeerId,
    max_voice_signals: usize,
) {
    match event {
        SwarmEvent::Behaviour(GridEvent::Gossipsub(gossipsub::Event::Message {
            propagation_source,
            message_id,
            message,
        })) => {
            if let Ok(value) = serde_json::from_slice::<serde_json::Value>(&message.data) {
                if let Some(voice) = value.get("voice_signal") {
                    if let Ok(sig) = serde_json::from_value::<VoiceSignal>(voice.clone()) {
                        if sig.from != local_peer_id.to_string() {
                            let mut guard = voice_signals.write();
                            guard.push(sig);
                            let n = guard.len();
                            if n > max_voice_signals {
                                let drop = n - max_voice_signals;
                                guard.drain(0..drop);
                            }
                        }
                        return;
                    }
                }
                if let Some(list) = value.get("channel_list").and_then(|v| v.as_array()) {
                    let channels: Vec<String> = list
                        .iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                    if !channels.is_empty() {
                        channel_state.merge_channels_from_remote(&channels);
                    }
                    return;
                }
                if let Some(removed) = value.get("channel_removed").and_then(|v| v.as_str()) {
                    channel_state.remove_channel_in_memory(removed);
                    return;
                }
                if let (Some(ch), Some(msg)) = (value.get("channel").and_then(|v| v.as_str()), value.get("message")) {
                    if let Ok(chat) = serde_json::from_value::<ChatMessage>(msg.clone()) {
                        if let Err(err) = channel_state.append_message(ch, chat.clone()) {
                            warn!(%err, "unable to persist message");
                        } else {
                            telemetry.note_message(chat.timestamp.to_rfc3339());
                            println!("[{}] {} :: {}", ch, chat.author, chat.body);
                            info!(%propagation_source, %message_id, "message received");
                        }
                    }
                }
            }
        }
        SwarmEvent::Behaviour(GridEvent::Mdns(mdns::Event::Discovered(list))) => {
            for (peer, _addr) in list {
                info!(%peer, "mdns peer discovered");
                telemetry.note_peer_online(&peer);
                swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer);
            }
        }
        SwarmEvent::Behaviour(GridEvent::Mdns(mdns::Event::Expired(list))) => {
            for (peer, _addr) in list {
                info!(%peer, "mdns peer expired");
                telemetry.note_peer_offline(&peer);
                swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer);
            }
        }
        SwarmEvent::ConnectionEstablished { peer_id, .. } => {
            telemetry.note_peer_online(&peer_id);
        }
        SwarmEvent::ConnectionClosed { peer_id, .. } => {
            telemetry.note_peer_offline(&peer_id);
        }
        SwarmEvent::NewListenAddr { address, .. } => {
            info!(%address, "listening");
            println!("listening on {address}");
        }
        SwarmEvent::Behaviour(GridEvent::Identify(event)) => {
            info!(?event, "identify event");
        }
        _ => {}
    }
}

async fn read_stdin(sender: mpsc::Sender<String>) {
    let mut lines = BufReader::new(io::stdin()).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        if sender.send(line).await.is_err() {
            break;
        }
    }
}

#[derive(Deserialize)]
struct PublishRequest {
    channel: String,
    body: String,
    author: Option<String>,
    #[serde(default)]
    attachments: Vec<AttachmentPayload>,
}

#[derive(Deserialize)]
struct AttachmentPayload {
    content_type: String,
    filename: String,
    data_base64: String,
}

#[derive(Serialize)]
struct StatusResponse {
    peer_id: String,
    peers: Vec<String>,
    message_count: usize,
    last_message: Option<String>,
}

#[derive(Deserialize)]
struct VoiceSignalRequest {
    #[serde(rename = "type")]
    kind: String,
    data: String,
    to: Option<String>,
}

async fn serve_api(bind: SocketAddr, state: ApiContext) -> Result<()> {
    let app = Router::new()
        .route("/health", get(api_health))
        .route("/channels", get(api_channels).post(api_create_channel))
        .route("/channels/:name", delete(api_delete_channel))
        .route("/messages", get(api_messages).post(api_publish))
        .route("/status", get(api_status))
        .route("/voice/signals", get(api_voice_signals))
        .route("/voice/signal", post(api_voice_signal_post))
        .with_state(state);

    let listener = TcpListener::bind(bind).await?;
    axum::serve(listener, app)
        .await
        .map_err(|err| anyhow!(err.to_string()))
}

async fn api_health() -> impl IntoResponse {
    StatusCode::OK
}

#[derive(Deserialize)]
struct MessagesQuery {
    #[serde(default = "default_channel")]
    channel: String,
}

fn default_channel() -> String {
    "general".to_string()
}

async fn api_channels(State(state): State<ApiContext>) -> impl IntoResponse {
    Json(state.channel_state.list())
}

#[derive(Deserialize)]
struct CreateChannelRequest {
    name: String,
}

async fn api_create_channel(
    State(state): State<ApiContext>,
    Json(payload): Json<CreateChannelRequest>,
) -> impl IntoResponse {
    if let Err(e) = state.channel_state.add_channel_local(&payload.name) {
        return (StatusCode::BAD_REQUEST, e.to_string());
    }
    if state.sender.send(ApiRequest::BroadcastChannelList).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "channel created but broadcast failed".to_string());
    }
    (StatusCode::CREATED, String::new())
}

async fn api_delete_channel(
    State(state): State<ApiContext>,
    AxumPath(name): AxumPath<String>,
) -> impl IntoResponse {
    if let Err(e) = state.channel_state.remove_channel_local(&name) {
        return (StatusCode::BAD_REQUEST, e.to_string());
    }
    if state.sender.send(ApiRequest::BroadcastChannelRemoved(name)).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "channel deleted but broadcast failed".to_string());
    }
    (StatusCode::NO_CONTENT, String::new())
}

async fn api_messages(
    State(state): State<ApiContext>,
    Query(q): Query<MessagesQuery>,
) -> impl IntoResponse {
    Json(state.channel_state.messages(&q.channel))
}

/// Max total size of attachment data (base64 decoded) per message to keep gossip payloads safe.
const MAX_ATTACHMENT_BYTES: usize = 512 * 1024; // 512 KB

async fn api_publish(
    State(state): State<ApiContext>,
    Json(payload): Json<PublishRequest>,
) -> impl IntoResponse {
    let channel = payload.channel.trim().to_lowercase();
    if channel.is_empty() {
        return StatusCode::BAD_REQUEST;
    }
    if !state.channel_state.list().contains(&channel) {
        return StatusCode::NOT_FOUND;
    }
    if payload.body.trim().is_empty() && payload.attachments.is_empty() {
        return StatusCode::BAD_REQUEST;
    }

    let author = payload
        .author
        .unwrap_or_else(|| state.fallback_author.clone());

    let mut total_attachment_bytes: usize = 0;
    let attachments: Vec<Attachment> = payload
        .attachments
        .iter()
        .filter_map(|a| {
            let decoded = base64::Engine::decode(
                &base64::engine::general_purpose::STANDARD,
                a.data_base64.as_bytes(),
            )
            .ok()?;
            let decoded_len = decoded.len();
            if total_attachment_bytes + decoded_len > MAX_ATTACHMENT_BYTES {
                return None;
            }
            total_attachment_bytes += decoded_len;
            Some(Attachment {
                content_type: a.content_type.clone(),
                filename: a.filename.clone(),
                data_base64: a.data_base64.clone(),
            })
        })
        .collect();

    let message = ChatMessage::with_attachments(author, payload.body, attachments);

    match state.sender.send(ApiRequest::SendMessage { channel, message }).await {
        Ok(_) => StatusCode::ACCEPTED,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn api_status(State(state): State<ApiContext>) -> impl IntoResponse {
    let snapshot = state.telemetry.snapshot();
    let message_count: usize = state.channel_state.list()
        .iter()
        .map(|ch| state.channel_state.messages(ch).len())
        .sum();
    Json(StatusResponse {
        peer_id: state.peer_id.clone(),
        peers: snapshot.peers,
        message_count,
        last_message: snapshot.last_message,
    })
}

async fn api_voice_signals(State(state): State<ApiContext>) -> impl IntoResponse {
    let signals = state.voice_signals.read().clone();
    Json(signals)
}

async fn api_voice_signal_post(
    State(state): State<ApiContext>,
    Json(payload): Json<VoiceSignalRequest>,
) -> impl IntoResponse {
    let signal = VoiceSignal {
        from: state.peer_id.clone(),
        to: payload.to,
        kind: payload.kind,
        data: payload.data,
    };
    if state.voice_tx.send(signal).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::ACCEPTED
}

fn load_or_create_identity(path: &Path) -> Result<identity::Keypair> {
    if path.exists() {
        let raw = fs::read(path)?;
        Ok(identity::Keypair::from_protobuf_encoding(&raw)?)
    } else {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let keypair = identity::Keypair::generate_ed25519();
        let encoded = keypair
            .to_protobuf_encoding()
            .map_err(|err| anyhow::Error::msg(err.to_string()))?;
        fs::write(path, encoded)?;
        Ok(keypair)
    }
}
