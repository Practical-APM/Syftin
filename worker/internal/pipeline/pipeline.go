package pipeline

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/syftin/worker/internal/config"
	"github.com/syftin/worker/internal/delivery"
	"github.com/syftin/worker/internal/extract"
	"github.com/syftin/worker/internal/sanitize"
	"github.com/syftin/worker/internal/scheduler"
)

type Pipeline struct {
	cfg    *config.Config
	runner *extract.Runner
	sched  *scheduler.Scheduler
}

func New(cfg *config.Config, sched *scheduler.Scheduler) *Pipeline {
	return &Pipeline{
		cfg: cfg,
		runner: extract.NewRunner(extract.Config{
			Fetch:         cfg.Fetch,
			OllamaBaseURL: cfg.OllamaBaseURL,
			OllamaModel:   cfg.OllamaModel,
		}),
		sched: sched,
	}
}

func (p *Pipeline) Process(ctx context.Context, job scheduler.Job) error {
	slog.Info(
		"processing job",
		slog.String("job_id", job.ID),
		slog.String("name", job.Name),
		slog.String("domain", job.Domain),
	)

	if err := sanitize.JobFields(job.Name, job.TargetURL, job.Domain); err != nil {
		return fmt.Errorf("sanitization: %w", err)
	}

	if err := p.sched.ClaimJob(ctx, job); err != nil {
		return fmt.Errorf("claim: %w", err)
	}

	var result extract.Result
	var err error

	if parsed, ok, parseErr := p.sched.GetCompletedEdgeParse(ctx, job.ID); parseErr == nil && ok && len(parsed) > 0 {
		result, err = p.runner.ResultFromParsed(ctx, parsed, job.ExampleSchema)
	} else if html, fetchErr := p.sched.GetCompletedFetchHTML(ctx, job.ID); fetchErr == nil && html != "" {
		result, err = p.runner.ExtractFromHTML(ctx, html, job.Domain, job.ExampleSchema)
	} else {
		result, err = p.runner.Extract(ctx, job.TargetURL, job.Domain, job.ExampleSchema)
	}
	if err != nil {
		return err
	}

	slog.Info(
		"extracted page",
		slog.String("job_id", job.ID),
		slog.String("domain", job.Domain),
		slog.String("fetch_method", result.FetchMethod),
		slog.Int("text_chars", result.TextChars),
	)

	if err := p.sched.MarkValidating(ctx, job.ID); err != nil {
		return fmt.Errorf("validating: %w", err)
	}

	if len(result.VarianceFlags) > 0 {
		slog.Warn(
			"variance flags",
			slog.String("job_id", job.ID),
			slog.Any("flags", result.VarianceFlags),
		)
	}

	if err := p.sched.MarkCompleted(
		ctx, job.ID, result.ComplianceScore, result.RecordCount,
		result.VarianceFlags, result.Output,
	); err != nil {
		return fmt.Errorf("complete: %w", err)
	}

	delivery.NotifyJobCompleted(ctx, job.ID)

	slog.Info(
		"job completed",
		slog.String("job_id", job.ID),
		slog.Float64("compliance_score", result.ComplianceScore),
		slog.Int("record_count", result.RecordCount),
	)
	return nil
}
