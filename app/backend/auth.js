import bcrypt from 'bcryptjs';
import { userByUsername, insertUser, userById, ensureWelcomeServer } from './db.js';

const SALT_ROUNDS = 10;

export async function register(username, password, displayName = null) {
  const trimmed = String(username).trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) throw new Error('Username must be at least 2 characters');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    insertUser.run(trimmed, hash, displayName?.trim() || null);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new Error('Username already taken');
    throw e;
  }
  const user = userByUsername.get(trimmed);
  ensureWelcomeServer(user.id);
  return { id: user.id, username: user.username, display_name: user.display_name };
}

export async function login(username, password) {
  const trimmed = String(username).trim().toLowerCase();
  const user = userByUsername.get(trimmed);
  if (!user) throw new Error('Invalid username or password');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid username or password');
  return { id: user.id, username: user.username, display_name: user.display_name };
}

export function getUserById(id) {
  if (!id) return null;
  const row = userById.get(id);
  if (!row) return null;
  return { id: row.id, username: row.username, display_name: row.display_name };
}

export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  req.user = getUserById(req.session.userId);
  if (!req.user) {
    req.session = null;
    return res.status(401).json({ error: 'Session invalid' });
  }
  next();
}
