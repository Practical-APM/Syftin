-- Early access waitlist (login without Supabase magic link)

CREATE TABLE IF NOT EXISTS waitlist_leads (
  email TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'login',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist_leads (created_at DESC);
