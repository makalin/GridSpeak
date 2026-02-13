# ⚡ GridSpeak

**The Resilient, Peer-to-Peer Communication Grid.**

GridSpeak is an open-source, decentralized alternative to Discord. It eliminates the need for central servers by turning every user into a node in a global, encrypted mesh network. 

No corporate silos. No data mining. No downtime.

---

## 🛠️ The Architecture

GridSpeak is built on the principle of **Local-First software**. Your data lives on your device and is synced directly with your peers.

* **P2P Core:** Powered by [libp2p](https://libp2p.io/) for transport, NAT traversal, and peer discovery.
* **State Sync:** Uses [CRDTs] to ensure all members of a "Grid" (Server) see the same message history without a central coordinator.
* **Security:** Noise Protocol Framework for handshakes and AES-GCM for end-to-end encryption.

---

## 🌟 Core Features

- **Decentralized Grids:** Create "Grids" (communities) that exist as long as at least one member is online.
- **Cryptographic Identity:** Your identity is your Public Key. No phone numbers or emails required.
- **Relay Support:** Optional community-run relays to help bootstrap connections and store encrypted "dead-drops" for offline peers.
- **Privacy by Design:** Metadata is minimized. IP obfuscation via circuit relaying is built-in.

---

## 🚦 Roadmap

- [ ] **Phase 1:** Core P2P connectivity and text-based 1:1 chat.
- [ ] **Phase 2:** Multi-user "Grids" with CRDT-based message history.
- [ ] **Phase 3:** Encrypted voice and video streaming via WebRTC/Pipe.
- [ ] **Phase 4:** Desktop (Tauri) and Mobile (React Native) clients.

---

## 💻 Tech Stack

- **Backend/Node:** Rust
- **Frontend:** Tauri
- **Storage:** SQLite/LMDB
- **Protocol:** libp2p

---

## 🤝 Contributing

GridSpeak is a community effort and looking for contributors interested in distributed systems, cryptography, and UI/UX design. 

1. Fork the repo.
2. Create your feature branch.
3. Submit a PR.

---

## 📄 License

This project is licensed under the **MIT License**.
