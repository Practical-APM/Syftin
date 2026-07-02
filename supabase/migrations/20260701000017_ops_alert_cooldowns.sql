-- Persist ops alert cooldowns (Slack/webhook dedupe across serverless instances)

CREATE TABLE IF NOT EXISTS ops_alert_cooldowns (
  alert_key TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_alert_cooldowns_last_sent
  ON ops_alert_cooldowns (last_sent_at DESC);

ALTER TABLE ops_alert_cooldowns ENABLE ROW LEVEL SECURITY;
