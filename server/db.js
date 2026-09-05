import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_id TEXT UNIQUE NOT NULL,
  name TEXT,
  opted_in INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '',
  last_message_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  body TEXT NOT NULL,
  wa_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en_US',
  variables TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id),
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  wa_message_id TEXT,
  error TEXT,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

export function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

export function upsertContact({ wa_id, name }) {
  const existing = db.prepare("SELECT * FROM contacts WHERE wa_id = ?").get(wa_id);
  if (existing) {
    if (name && name !== existing.name) {
      db.prepare("UPDATE contacts SET name = ? WHERE id = ?").run(name, existing.id);
    }
    return db.prepare("SELECT * FROM contacts WHERE id = ?").get(existing.id);
  }
  const info = db
    .prepare("INSERT INTO contacts (wa_id, name) VALUES (?, ?)")
    .run(wa_id, name || null);
  return db.prepare("SELECT * FROM contacts WHERE id = ?").get(info.lastInsertRowid);
}

export function touchContactLastMessage(contactId) {
  db.prepare("UPDATE contacts SET last_message_at = datetime('now') WHERE id = ?").run(contactId);
}

export function recentHistory(contactId, limit = 12) {
  const rows = db
    .prepare(
      "SELECT direction, body FROM messages WHERE contact_id = ? ORDER BY id DESC LIMIT ?"
    )
    .all(contactId, limit);
  return rows.reverse();
}

export function insertMessage({ contact_id, direction, body, wa_message_id = null, status = "received", ai_generated = 0 }) {
  const info = db
    .prepare(
      `INSERT INTO messages (contact_id, direction, body, wa_message_id, status, ai_generated)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(contact_id, direction, body, wa_message_id, status, ai_generated ? 1 : 0);
  touchContactLastMessage(contact_id);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid);
}
