# GridSpeak (Discord-like app)

Central server + SQLite + React. Servers, channels, users, messages, auth.

---

## Run

From this folder:

```bash
./start.sh
```

- **Frontend:** http://localhost:5174  
- **Backend:** http://localhost:3000 (API; frontend proxies `/api` to it)

---

## Features

- **Auth:** Register, login, logout (session cookies).
- **Servers:** Create servers; each gets a default `#general` channel.
- **Channels:** Create text channels per server.
- **Messages:** Send messages in a channel; history per channel.
- **Members:** Member list for the current server.

---

## Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3), bcryptjs, express-session.
- **Frontend:** React 18, TypeScript, Vite.
- **Data:** SQLite at `backend/data/gridspeak.db` (created on first run).

---

## API (prefix `/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | no | `{ username, password, display_name? }` |
| POST | /auth/login | no | `{ username, password }` |
| POST | /auth/logout | no | Destroys session |
| GET | /auth/me | no | Current user or 401 |
| GET | /servers | yes | List my servers |
| POST | /servers | yes | `{ name }` — create server |
| GET | /servers/:id/channels | yes | List channels |
| POST | /servers/:id/channels | yes | `{ name }` — create channel |
| GET | /channels/:id/messages | yes | List messages |
| POST | /channels/:id/messages | yes | `{ content }` — send message |
| GET | /servers/:id/members | yes | List members |

---

## First run

1. Register a user. A default **Welcome** server with `#general` is created.
2. Add servers with the **+** pill; add channels with **+** next to Channels.
3. Pick a channel and send messages.
