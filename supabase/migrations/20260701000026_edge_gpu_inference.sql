-- Edge GPU inference: local Ollama parse on contributor nodes

ALTER TABLE fetch_tasks
  ADD COLUMN IF NOT EXISTS parsed_output JSONB,
  ADD COLUMN IF NOT EXISTS edge_inference BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inference_model TEXT;

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_edge_inference
  ON fetch_tasks (edge_inference)
  WHERE edge_inference = true;
