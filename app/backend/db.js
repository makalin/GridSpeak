import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.SQLITE_PATH || join(dataDir, 'gridspeak.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS server_members (
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (server_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(server_id, name)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
`);

export function ensureWelcomeServer(ownerId) {
  const existing = db.prepare('SELECT id FROM servers WHERE owner_id = ?').get(ownerId);
  if (existing) return existing.id;
  const insert = db.prepare('INSERT INTO servers (name, owner_id) VALUES (?, ?)');
  const run = insert.run('Welcome', ownerId);
  const serverId = run.lastInsertRowid;
  db.prepare('INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, ?)').run(serverId, ownerId, 'owner');
  db.prepare('INSERT INTO channels (server_id, name, type) VALUES (?, ?, ?)').run(serverId, 'general', 'text');
  return serverId;
}

export const userById = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?');
export const userByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
export const insertUser = db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)');
export const serversForUser = db.prepare(`
  SELECT s.id, s.name, s.owner_id FROM servers s
  INNER JOIN server_members m ON m.server_id = s.id WHERE m.user_id = ? ORDER BY s.name
`);
export const insertServer = db.prepare('INSERT INTO servers (name, owner_id) VALUES (?, ?)');
export const addMember = db.prepare('INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, ?)');
export const serverById = db.prepare('SELECT id, name, owner_id FROM servers WHERE id = ?');
export const isMember = db.prepare('SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?');
export const channelsByServer = db.prepare('SELECT id, server_id, name, type FROM channels WHERE server_id = ? ORDER BY id');
export const insertChannel = db.prepare('INSERT INTO channels (server_id, name, type) VALUES (?, ?, ?)');
export const channelById = db.prepare('SELECT id, server_id, name, type FROM channels WHERE id = ?');
export const messagesByChannel = db.prepare(`
  SELECT m.id, m.channel_id, m.content, m.created_at, u.id AS user_id, u.username, u.display_name
  FROM messages m JOIN users u ON u.id = m.user_id WHERE m.channel_id = ? ORDER BY m.created_at ASC
`);
export const insertMessage = db.prepare('INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)');
export const membersByServer = db.prepare(`
  SELECT u.id, u.username, u.display_name, m.role FROM server_members m
  JOIN users u ON u.id = m.user_id WHERE m.server_id = ? ORDER BY m.role DESC, u.username
`);

export default db;
