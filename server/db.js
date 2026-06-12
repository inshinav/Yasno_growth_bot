import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = resolve(process.cwd(), process.env.DB_PATH || './data/yasno.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(readFileSync(resolve(__dirname, 'schema.sql'), 'utf8'));

export function getOrCreateUser(tgUser) {
  const tgId = String(tgUser.id);
  let row = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);
  if (!row) {
    db.prepare('INSERT INTO users (tg_id, first_name, username) VALUES (?, ?, ?)')
      .run(tgId, tgUser.first_name || '', tgUser.username || '');
    row = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);
    db.prepare('INSERT OR IGNORE INTO streaks (user_id) VALUES (?)').run(row.id);
  } else {
    db.prepare("UPDATE users SET last_seen_at = datetime('now'), first_name = ?, username = ? WHERE id = ?")
      .run(tgUser.first_name || row.first_name, tgUser.username || row.username, row.id);
  }
  return row;
}

export function logEvent(userId, type, payload = null) {
  db.prepare('INSERT INTO events (user_id, type, payload) VALUES (?, ?, ?)')
    .run(userId ?? null, type, payload ? JSON.stringify(payload) : null);
}
