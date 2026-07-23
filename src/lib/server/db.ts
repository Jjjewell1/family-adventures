import initSqlJs, { type Database } from 'sql.js';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = env.DATABASE_PATH || './data/family-adventures.db';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new SQL.Database();
    initializeDatabase();
    saveDb();
  } else {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(buffer));
  }

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

// Auto-save every 5 seconds if there are changes
let dirty = false;
setInterval(() => {
  if (dirty && db) {
    saveDb();
    dirty = false;
  }
}, 5000);

function markDirty() {
  dirty = true;
}

function initializeDatabase() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      immich_user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS adventures (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      content TEXT,
      cover_asset_id TEXT,
      location_name TEXT,
      lat REAL,
      lng REAL,
      start_date TEXT,
      end_date TEXT,
      visibility TEXT DEFAULT 'family',
      mood TEXT,
      template_type TEXT,
      is_draft INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS adventure_media (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      immich_asset_id TEXT NOT NULL,
      media_type TEXT DEFAULT 'photo',
      caption TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      parent_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#0E7C7B'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS adventure_tags (
      adventure_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (adventure_id, tag_id),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS public_shares (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      expires_at TEXT,
      allow_download INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_feed (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      adventure_id TEXT,
      action_type TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE
    )
  `);
}

// Helper functions that mimic better-sqlite3 API
export function dbRun(sql: string, ...params: any[]): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  markDirty();
}

export function dbGet<T = any>(sql: string, ...params: any[]): T | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row: any = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    stmt.free();
    return row as T;
  }
  stmt.free();
  return undefined;
}

export function dbAll<T = any>(sql: string, ...params: any[]): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row: any = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    rows.push(row as T);
  }
  stmt.free();
  return rows;
}

export { getDb, saveDb };

// Initialize on import
getDb().then(() => {
  console.log('Database initialized');
}).catch(console.error);
