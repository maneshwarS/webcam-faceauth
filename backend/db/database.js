const { createClient } = require('@libsql/client');
require('dotenv').config();

let db;

function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url) {
      // Production: connect to Turso cloud
      db = createClient({ url, authToken });
    } else {
      // Local dev: use local SQLite file
      const path = require('path');
      const DB_PATH = process.env.DB_PATH || './db/faceid.db';
      const dbPath = 'file:' + path.resolve(__dirname, '..', DB_PATH.replace('./', ''));
      db = createClient({ url: dbPath });
    }
  }
  return db;
}

async function initSchema() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL,
      email               TEXT UNIQUE NOT NULL,
      password            TEXT NOT NULL,
      face_descriptor     TEXT,
      face_registered_at  TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token_hash  TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      device_hint TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

module.exports = { getDb, initSchema };
