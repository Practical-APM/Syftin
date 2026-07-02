package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/syftin/worker/internal/config"
	"github.com/syftin/worker/internal/supabase"
)

type Job struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	TargetURL     string          `json:"target_url"`
	Domain        string          `json:"domain"`
	ExampleSchema json.RawMessage `json:"example_schema"`
	Status        string          `json:"status"`
	AttemptCount  int             `json:"attempt_count"`
}

type Scheduler struct {
	client    *supabase.Client
	workerID  string
	fetchMode string
}

func New(cfg *config.Config) *Scheduler {
	return &Scheduler{
		client:    supabase.New(cfg.SupabaseURL, cfg.SupabaseServiceKey),
		workerID:  cfg.WorkerID,
		fetchMode: string(cfg.Fetch.Mode),
	}
}

func (s *Scheduler) FetchQueuedJobs(ctx context.Context) ([]Job, error) {
	q := url.Values{}
	q.Set("status", "eq.queued")
	q.Set("order", "created_at.asc")
	q.Set("limit", "5")

	var jobs []Job
	if err := s.client.Get(ctx, "jobs", q, &jobs); err != nil {
		return nil, err
	}
	return jobs, nil
}

func (s *Scheduler) RecordHeartbeat(ctx context.Context) error {
	now := time.Now().UTC().Format(time.RFC3339)
	return s.client.Upsert(ctx, "worker_heartbeats", map[string]any{
		"worker_id":    s.workerID,
		"last_seen_at": now,
		"fetch_mode":   s.fetchMode,
	})
}

func (s *Scheduler) WorkerID() string {
	return s.workerID
}

func (s *Scheduler) MarkFailed(ctx context.Context, jobID, message string) error {
	q := url.Values{}
	q.Set("id", "eq."+jobID)
	now := time.Now().UTC().Format(time.RFC3339)

	if err := s.client.Patch(ctx, "jobs", q, map[string]any{
		"status":        "failed",
		"error_message": message,
		"completed_at":  now,
	}); err != nil {
		return err
	}

	run := map[string]any{
		"job_id":      jobID,
		"worker_id":   s.workerID,
		"status":      "failed",
		"started_at":  now,
		"finished_at": now,
	}
	return s.client.Post(ctx, "job_runs", run, nil)
}

func (s *Scheduler) RequeueStaleJobs(ctx context.Context, maxAge time.Duration) (int, error) {
	cutoff := time.Now().Add(-maxAge).UTC().Format(time.RFC3339)
	q := url.Values{}
	q.Set("status", "eq.processing")
	q.Set("updated_at", "lt."+cutoff)

	var rows []Job
	n, err := s.client.PatchRows(ctx, "jobs", q, map[string]any{
		"status":                "queued",
		"error_message":         "Requeued after worker stopped responding",
		"processing_started_at": nil,
	}, &rows)
	if err != nil {
		return 0, err
	}
	if n > 0 {
		log.Printf("requeued %d stale processing job(s)", n)
	}
	return n, nil
}

func (s *Scheduler) MarkValidating(ctx context.Context, jobID string) error {
	q := url.Values{}
	q.Set("id", "eq."+jobID)
	q.Set("status", "eq.processing")
	return s.client.Patch(ctx, "jobs", q, map[string]any{
		"status": "validating",
	})
}

func (s *Scheduler) MarkCompleted(ctx context.Context, jobID string, score float64, records int, flags []string, output json.RawMessage) error {
	q := url.Values{}
	q.Set("id", "eq."+jobID)
	now := time.Now().UTC().Format(time.RFC3339)

	flagsJSON, _ := json.Marshal(flags)

	q.Set("status", "in.(processing,validating)")
	if err := s.client.Patch(ctx, "jobs", q, map[string]any{
		"status":           "completed",
		"compliance_score": score,
		"record_count":     records,
		"variance_flags":   json.RawMessage(flagsJSON),
		"completed_at":     now,
	}); err != nil {
		return err
	}

	run := map[string]any{
		"job_id":           jobID,
		"worker_id":        s.workerID,
		"status":           "completed",
		"started_at":       now,
		"finished_at":      now,
		"parsed_output":    json.RawMessage(output),
		"compliance_score": score,
	}
	return s.client.Post(ctx, "job_runs", run, nil)
}

func (s *Scheduler) GetCompletedFetchHTML(ctx context.Context, jobID string) (string, error) {
	q := url.Values{}
	q.Set("job_id", "eq."+jobID)
	q.Set("status", "eq.completed")
	q.Set("order", "completed_at.desc")
	q.Set("limit", "1")
	q.Set("select", "html_payload")

	var rows []struct {
		HTMLPayload string `json:"html_payload"`
	}
	if err := s.client.Get(ctx, "fetch_tasks", q, &rows); err != nil {
		return "", err
	}
	if len(rows) == 0 || rows[0].HTMLPayload == "" {
		return "", nil
	}
	return rows[0].HTMLPayload, nil
}

// GetCompletedEdgeParse returns GPU-inferred JSON from a contributor edge node.
func (s *Scheduler) GetCompletedEdgeParse(ctx context.Context, jobID string) (json.RawMessage, bool, error) {
	q := url.Values{}
	q.Set("job_id", "eq."+jobID)
	q.Set("status", "eq.completed")
	q.Set("edge_inference", "eq.true")
	q.Set("order", "completed_at.desc")
	q.Set("limit", "1")
	q.Set("select", "parsed_output,edge_inference")

	var rows []struct {
		ParsedOutput  json.RawMessage `json:"parsed_output"`
		EdgeInference bool            `json:"edge_inference"`
	}
	if err := s.client.Get(ctx, "fetch_tasks", q, &rows); err != nil {
		return nil, false, err
	}
	if len(rows) == 0 || !rows[0].EdgeInference || len(rows[0].ParsedOutput) == 0 {
		return nil, false, nil
	}
	return rows[0].ParsedOutput, true, nil
}

func (s *Scheduler) ClaimJob(ctx context.Context, job Job) error {
	q := url.Values{}
	q.Set("id", "eq."+job.ID)
	q.Set("status", "in.(queued,pending)")

	now := time.Now().UTC().Format(time.RFC3339)
	var rows []Job
	n, err := s.client.PatchRows(ctx, "jobs", q, map[string]any{
		"status":                 "processing",
		"processing_started_at":  now,
		"attempt_count":          job.AttemptCount + 1,
		"error_message":          nil,
	}, &rows)
	if err != nil {
		return fmt.Errorf("claim job: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("job %s already claimed or not queued", job.ID)
	}
	return nil
}
