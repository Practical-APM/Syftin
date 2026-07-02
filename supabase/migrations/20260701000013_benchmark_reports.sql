-- Domain benchmark reports (persisted from worker benchmark suite)

CREATE TABLE IF NOT EXISTS benchmark_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL,
  target_compliance NUMERIC(5,2) NOT NULL,
  average_score NUMERIC(5,2) NOT NULL,
  passed_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_reports_created
  ON benchmark_reports (created_at DESC);
