-- Eoynx Edge Gateway D1 schema

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ko TEXT,
  description TEXT NOT NULL,
  description_ko TEXT,
  homepage TEXT,
  api_base TEXT,
  endpoints TEXT,
  auth_type TEXT,
  rate_limit TEXT,
  contact_email TEXT,
  ai_txt TEXT,
  json_ld TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);

CREATE TABLE IF NOT EXISTS service_logs (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  url TEXT NOT NULL,
  parsed_at TEXT DEFAULT (datetime('now')),
  status TEXT,
  payload TEXT,
  FOREIGN KEY(service_id) REFERENCES services(id)
);
