/**
 * Local block/ignore list (stored in localStorage).
 * Blocked authors' messages are hidden only on this client.
 */

const STORAGE_KEY = 'gridspeak-blocked-authors';

function load(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function save(set: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function getBlocked(): Set<string> {
  return load();
}

export function addBlocked(author: string): void {
  const set = load();
  set.add(author.trim());
  save(set);
}

export function removeBlocked(author: string): void {
  const set = load();
  set.delete(author);
  save(set);
}

export function isBlocked(author: string): boolean {
  return load().has(author);
}
