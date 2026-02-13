# GridSpeak P2P

Decentralized mesh chat: one node per user, libp2p + gossipsub. No central server. Nodes discover each other (mDNS or bootstrap) and sync over a shared topic.

---

## What’s here

- **backend/** — Rust node (libp2p, gossipsub, REST API, voice signaling).
- **frontend/** — React web UI (Discord-like layout, messages, attachments, voice/video).
- **start.sh** — Build and run backend + frontend.

**Requirements:** Rust 1.73+, Node.js 18+.

---

## Run

From this directory:

```bash
./start.sh
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://127.0.0.1:7070  

---

## Features

- **Channels:** Multiple channels per grid; create and delete (except #general). Channel list synced across peers.
- **Messages:** Text + attachments (images, files, audio, video; ~512 KB limit).
- **Voice & video:** WebRTC via signaling over the same gossip topic.
- **Identity:** Display name in localStorage; no login.
- **Block list:** Local only; hide messages from chosen authors.

---

## Connecting two nodes

1. Run `./start.sh` in two terminals (or on two machines).
2. Copy the “Listen address” from one node (e.g. `/ip4/127.0.0.1/tcp/0`) and add it as a bootstrap peer in the other (e.g. in config or via the node’s bootstrap list).
3. Once connected, both see the same channels and messages on the shared topic.

Config and message store live in the backend directory (e.g. `config.toml`, `messages-*.json`).
