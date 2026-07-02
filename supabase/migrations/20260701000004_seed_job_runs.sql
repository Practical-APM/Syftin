-- Seed parsed_output for demo completed jobs so downloads work out of the box

INSERT INTO job_runs (
  job_id, worker_id, status, started_at, finished_at, parsed_output, compliance_score
)
SELECT
  'b0000000-0000-4000-8000-000000000001',
  'seed-worker',
  'completed',
  '2026-06-28T10:00:00Z'::timestamptz,
  '2026-06-28T10:45:00Z'::timestamptz,
  '[{"product_name":"Amul Taaza Milk 1L","price_inr":56,"mrp_inr":62,"in_stock":true}]'::jsonb,
  99.20
WHERE NOT EXISTS (
  SELECT 1 FROM job_runs WHERE job_id = 'b0000000-0000-4000-8000-000000000001'
);

INSERT INTO job_runs (
  job_id, worker_id, status, started_at, finished_at, parsed_output, compliance_score
)
SELECT
  'b0000000-0000-4000-8000-000000000003',
  'seed-worker',
  'completed',
  '2026-06-25T14:00:00Z'::timestamptz,
  '2026-06-25T16:20:00Z'::timestamptz,
  '[{"company_name":"Example Pvt Ltd","cin":"U12345MH2020PTC123456","filing_date":"2026-06-20","filing_type":"Annual Return"}]'::jsonb,
  98.70
WHERE NOT EXISTS (
  SELECT 1 FROM job_runs WHERE job_id = 'b0000000-0000-4000-8000-000000000003'
);
