-- Activity log backup. One row per log entry; the full entry is stored as JSON in
-- `data`. `updated_at` drives last-write-wins; `deleted` is a soft-delete tombstone.
CREATE TABLE IF NOT EXISTS logs (
  id         TEXT PRIMARY KEY,
  updated_at TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  data       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_updated_at ON logs (updated_at);
