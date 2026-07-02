-- Allow buyers to cancel in-flight jobs

ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled';
