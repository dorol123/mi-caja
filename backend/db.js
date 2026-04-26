const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new DatabaseSync(path.join(DATA_DIR, 'micaja.db'));

db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    creator_id INTEGER NOT NULL,
    initial_amount REAL,
    is_unlimited INTEGER DEFAULT 0,
    frequency_days INTEGER DEFAULT 30,
    current_balance REAL DEFAULT 0,
    show_balance_to_users INTEGER DEFAULT 0,
    next_reset_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    org_id INTEGER NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    reimbursement_balance REAL DEFAULT 0,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actioned_at DATETIME,
    actioned_by INTEGER,
    UNIQUE(user_id, org_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    org_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    photo_path TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actioned_at DATETIME,
    actioned_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    affected_user_id INTEGER,
    actioned_by INTEGER NOT NULL,
    amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );
`);

// node:sqlite returns BigInt for INTEGER columns by default.
// Wrap prepare() to always disable BigInt so values come back as regular numbers.
const _prepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = _prepare(sql);
  stmt.setReadBigInts(false);
  return stmt;
};

// Migrations
try { db.exec('ALTER TABLE memberships ADD COLUMN display_name TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch {}

module.exports = db;
