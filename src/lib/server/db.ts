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

    // Check if immich_asset_id has NOT NULL constraint — rebuild table if so
    const immichCol = mediaTableInfo[0].values.find(r => r[1] === 'immich_asset_id');
    if (immichCol && immichCol[3] === 1) {
      db.run(`
        CREATE TABLE IF NOT EXISTS adventure_media_new (
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
        INSERT INTO adventure_media_new (id, adventure_id, immich_asset_id, file_path, media_type, caption, order_index, created_at)
        SELECT id, adventure_id, immich_asset_id, file_path, media_type, caption, order_index, created_at FROM adventure_media
      `);
      db.run("DROP TABLE adventure_media");
      db.run("ALTER TABLE adventure_media_new RENAME TO adventure_media");
      markDirty();
    }
  }

  // Check if adventures has cover_file_path column
  const adventuresTableInfo = db.exec("PRAGMA table_info(adventures)");
  if (adventuresTableInfo.length > 0) {
    const advCols = adventuresTableInfo[0].values.map(r => r[1] as string);
    if (!advCols.includes('cover_file_path')) {
      db.run("ALTER TABLE adventures ADD COLUMN cover_file_path TEXT");
      markDirty();
    }
  }

  // Add Google auth columns to users table
  const usersTableInfo = db.exec("PRAGMA table_info(users)");
  if (usersTableInfo.length > 0) {
    const userCols = usersTableInfo[0].values.map(r => r[1] as string);
    if (!userCols.includes('provider')) {
      db.run("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'");
      markDirty();
    }
    if (!userCols.includes('provider_id')) {
      db.run("ALTER TABLE users ADD COLUMN provider_id TEXT");
      markDirty();
    }
    if (!userCols.includes('approved')) {
      db.run("ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1");
      markDirty();
    }
  }

  // Create missing tables (added after initial DB creation)
  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location_name TEXT,
      lat REAL,
      lng REAL,
      category TEXT DEFAULT 'destination',
      status TEXT DEFAULT 'wishlist',
      cover_image TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list_votes (
      bucket_item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (bucket_item_id, user_id),
      FOREIGN KEY (bucket_item_id) REFERENCES bucket_list(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list_comments (
      id TEXT PRIMARY KEY,
      bucket_item_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bucket_item_id) REFERENCES bucket_list(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      label TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(adventure_id, author_id),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS adventure_stories (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_comments (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES adventure_stories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
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
      provider TEXT DEFAULT 'local',
      provider_id TEXT,
      approved INTEGER DEFAULT 1,
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
      cover_file_path TEXT,
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

  // Bucket List
  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location_name TEXT,
      lat REAL,
      lng REAL,
      category TEXT DEFAULT 'destination',
      status TEXT DEFAULT 'wishlist',
      cover_image TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list_votes (
      bucket_item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (bucket_item_id, user_id),
      FOREIGN KEY (bucket_item_id) REFERENCES bucket_list(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bucket_list_comments (
      id TEXT PRIMARY KEY,
      bucket_item_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bucket_item_id) REFERENCES bucket_list(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Ratings
  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      label TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(adventure_id, author_id),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Adventure Stories
  db.run(`
    CREATE TABLE IF NOT EXISTS adventure_stories (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_comments (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES adventure_stories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
}

// Helper functions that mimic better-sqlite3 API
function sanitizeParams(params: any[]): any[] {
  return params.map(p => p === undefined ? null : p);
}

export async function dbRun(sql: string, ...params: any[]): Promise<void> {
  await getDb();
  db!.run(sql, sanitizeParams(params));
  markDirty();
}

export async function dbGet<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
  await getDb();
  const stmt = db!.prepare(sql);
  stmt.bind(sanitizeParams(params));
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

export async function dbAll<T = any>(sql: string, ...params: any[]): Promise<T[]> {
  await getDb();
  const stmt = db!.prepare(sql);
  stmt.bind(sanitizeParams(params));
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

async function seedDefaultAdmin() {
  if (!db) return;
  const existingAdmin = await dbGet('SELECT id FROM users WHERE role = ? LIMIT 1', 'admin');
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
  console.log('Default admin created — login with admin@family.local');
}
