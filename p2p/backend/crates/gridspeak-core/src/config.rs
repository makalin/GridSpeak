use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::Result;
use dirs::data_dir;
use serde::{Deserialize, Serialize};

fn default_data_dir() -> PathBuf {
    data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("gridspeak")
}

fn default_topic() -> String {
    "gridspeak-global".to_string()
}

fn default_nickname() -> String {
    whoami::username()
}

fn default_channels() -> Vec<String> {
    vec!["general".to_string()]
}

/// Configuration describing how a node participates in the mesh network.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    #[serde(default = "default_data_dir")]
    pub data_dir: PathBuf,
    #[serde(default = "default_topic")]
    pub topic: String,
    #[serde(default)]
    pub bootstrap_nodes: Vec<String>,
    #[serde(default = "default_nickname")]
    pub nickname: String,
    #[serde(default = "default_channels")]
    pub channels: Vec<String>,
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            data_dir: default_data_dir(),
            topic: default_topic(),
            bootstrap_nodes: vec![],
            nickname: default_nickname(),
            channels: default_channels(),
        }
    }
}

impl NodeConfig {
    pub fn config_file(data_dir: &Path) -> PathBuf {
        data_dir.join("gridspeak.toml")
    }

    /// Appends a channel name if not present and saves config.
    pub fn add_channel(&mut self, name: &str, path: impl AsRef<Path>) -> Result<()> {
        let name = name.trim().to_lowercase();
        if name.is_empty() || name.len() > 64 {
            return Err(anyhow::anyhow!("invalid channel name"));
        }
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
            return Err(anyhow::anyhow!("channel name must be alphanumeric, - or _"));
        }
        if self.channels.contains(&name) {
            return Ok(());
        }
        self.channels.push(name.clone());
        self.save(path)
    }

    /// Removes a channel by name and saves config.
    pub fn remove_channel(&mut self, name: &str, path: impl AsRef<Path>) -> Result<()> {
        self.channels.retain(|c| c != name);
        self.save(path)
    }

    /// Persists configuration to disk, creating parent directories when missing.
    pub fn save(&self, path: impl AsRef<Path>) -> Result<()> {
        if let Some(parent) = path.as_ref().parent() {
            fs::create_dir_all(parent)?;
        }

        let contents = toml::to_string_pretty(self)?;
        let mut file = fs::File::create(path)?;
        file.write_all(contents.as_bytes())?;
        Ok(())
    }
}

/// Loads configuration from disk, creating a default file when absent.
pub fn load_or_create_config(path: impl AsRef<Path>) -> Result<NodeConfig> {
    let path = path.as_ref();
    if path.exists() {
        let contents = fs::read_to_string(path)?;
        Ok(toml::from_str(&contents)?)
    } else {
        let config = NodeConfig::default();
        config.save(path)?;
        Ok(config)
    }
}
