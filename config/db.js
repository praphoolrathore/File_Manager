const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// The database is a single file. DB_PATH can be changed in .env.
const dbPath = path.resolve(process.env.DB_PATH || './data/app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath); // open sqlite database

// SQLite does NOT enforce foreign keys unless this is switched on for each connection.
db.pragma('foreign_keys = ON');
// WAL mode lets reads and writes happen at the same time without blocking each other.
db.pragma('journal_mode = WAL');

// Create tables right here, when this file is first loaded.
// The models prepare their SQL as soon as they are required, so the tables
// must already exist by then. Doing it at load time guarantees that order.
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      display_name  TEXT,
      stored_name   TEXT NOT NULL UNIQUE,
      mime_type     TEXT NOT NULL,
      size          INTEGER NOT NULL,
      path          TEXT NOT NULL,
      uploaded_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
`);

// Migration safeguard: Ensure display_name column exists if database already existed
const fileColumns = db.prepare('PRAGMA table_info(files)').all();
if (!fileColumns.some((col) => col.name === 'display_name')) {
  db.exec('ALTER TABLE files ADD COLUMN display_name TEXT;');
}

console.log(`SQLite ready: ${dbPath}`);

module.exports = { db };
