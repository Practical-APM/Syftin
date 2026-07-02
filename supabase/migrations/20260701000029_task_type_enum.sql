-- Phase 3: Task type separation on fetch_tasks

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('fetch', 'parse', 'validate', 'enrich');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE fetch_tasks ADD COLUMN IF NOT EXISTS task_type task_type NOT NULL DEFAULT 'fetch';

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_type_status
  ON fetch_tasks (task_type, status, created_at);
