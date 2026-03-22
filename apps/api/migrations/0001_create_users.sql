-- Users table: core authentication and role management
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('worker', 'business', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK(status IN ('active', 'suspended', 'pending_verification', 'deleted')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
