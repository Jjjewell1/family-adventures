import initSqlJs, { type Database } from 'sql.js';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { createHmac, randomBytes } from 'crypto';

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
    migrateDatabase();
    saveDb();
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

function migrateDatabase() {
  if (!db) return;

  const columns = db.exec("PRAGMA table_info(users)");
  if (columns.length > 0) {
    const userCols = columns[0].values.map(r => r[1] as string);

    if (!userCols.includes('password_hash')) {
      db.run("ALTER TABLE users ADD COLUMN password_hash TEXT");
      markDirty();
    }

    if (!userCols.includes('username')) {
      db.run("ALTER TABLE users ADD COLUMN username TEXT");
      markDirty();
    }

    // Recreate users table if immich_user_id has NOT NULL constraint
    // SQLite can't ALTER COLUMN, so we rebuild
    const immichCol = columns[0].values.find(r => r[1] === 'immich_user_id');
    if (immichCol && immichCol[3] === 1) {
      db.run(`
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT,
          avatar_url TEXT,
          role TEXT DEFAULT 'member',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      db.run(`
        INSERT INTO users_new (id, username, email, name, password_hash, avatar_url, role, created_at)
        SELECT id, username, email, name, password_hash, avatar_url, role, created_at FROM users
      `);
      db.run("DROP TABLE users");
      db.run("ALTER TABLE users_new RENAME TO users");
      markDirty();
    }
  }

  // Check if adventure_media has file_path column
  const mediaTableInfo = db.exec("PRAGMA table_info(adventure_media)");
  if (mediaTableInfo.length > 0) {
    const mediaCols = mediaTableInfo[0].values.map(r => r[1] as string);
    if (!mediaCols.includes('file_path')) {
      db.run("ALTER TABLE adventure_media ADD COLUMN file_path TEXT");
      markDirty();
    }
  }
}

function initializeDatabase() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
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
      immich_asset_id TEXT,
      file_path TEXT,
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
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export { getDb, saveDb };

// Initialize on import
getDb().then(() => {
  console.log('Database initialized');
  seedDefaultAdmin();
}).catch(console.error);

function seedDefaultAdmin() {
  if (!db) return;
  const existingAdmin = dbGet('SELECT id FROM users WHERE role = ? LIMIT 1', 'admin');
  if (existingAdmin) return;

  const SESSION_SECRET = env.SESSION_SECRET || 'change-this-to-a-random-string';

  const userId = randomBytes(16).toString('hex');
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', SESSION_SECRET).update('admin123' + salt).digest('hex');
  const passwordHash = `${salt}:${hash}`;

  db.run(
    'INSERT INTO users (id, username, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, 'admin', 'admin@family.local', 'Admin', passwordHash, 'admin']
  );
  markDirty();
  saveDb();
  console.log('Default admin created — login with admin@family.local / admin123');
}
