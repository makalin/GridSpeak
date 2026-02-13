# ⚡ GridSpeak

Two chat apps in one repo:

| Project | Location | Run |
|---------|----------|-----|
| **P2P** | [**`p2p/`**](p2p/) | `cd p2p && ./start.sh` → http://localhost:5173 |
| **Discord-like** | [**`app/`**](app/) | `cd app && ./start.sh` → http://localhost:5174 |

- **P2P** — Decentralized mesh: one node per user, libp2p + gossipsub. Channels, attachments, voice/video. See [p2p/README.md](p2p/README.md).
- **Discord-like** — Central server + SQLite + React. Servers, channels, users, auth. See [app/README.md](app/README.md).

---

## Contributing

Fork the repo, make changes in `p2p/` or `app/` as relevant, then open a PR.

---

## License

MIT.
