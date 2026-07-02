package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/syftin/worker/internal/config"
	"github.com/syftin/worker/internal/delivery"
	"github.com/syftin/worker/internal/llm"
	"github.com/syftin/worker/internal/logx"
	"github.com/syftin/worker/internal/pipeline"
	"github.com/syftin/worker/internal/scheduler"
)

func main() {
	_ = godotenv.Load()
	logger := logx.Init()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("config load failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := llm.ModelAvailable(ctx, cfg.OllamaBaseURL, cfg.OllamaModel); err != nil {
		logger.Error("ollama unavailable", slog.String("error", err.Error()))
		os.Exit(1)
	}
	logger.Info("ollama ready", slog.String("model", cfg.OllamaModel))

	sched := scheduler.New(cfg)
	pipe := pipeline.New(cfg, sched)

	logger.Info(
		"hub worker starting",
		slog.String("worker_id", cfg.WorkerID),
		slog.Duration("poll_interval", cfg.PollInterval),
		slog.String("fetch_mode", string(cfg.Fetch.Mode)),
		slog.String("ollama_url", cfg.OllamaBaseURL),
	)

	ticker := time.NewTicker(cfg.PollInterval)
	defer ticker.Stop()

	var heartbeatMisses int

	runBatch(ctx, logger, sched, pipe, &heartbeatMisses)

	for {
		select {
		case <-ctx.Done():
			logger.Info("hub worker shutting down")
			return
		case <-ticker.C:
			runBatch(ctx, logger, sched, pipe, &heartbeatMisses)
		}
	}
}

func runBatch(
	ctx context.Context,
	logger *slog.Logger,
	sched *scheduler.Scheduler,
	pipe *pipeline.Pipeline,
	heartbeatMisses *int,
) {
	if err := sched.RecordHeartbeat(ctx); err != nil {
		*heartbeatMisses++
		attrs := []any{
			slog.String("error", err.Error()),
			slog.Int("consecutive_misses", *heartbeatMisses),
			slog.String("worker_id", sched.WorkerID()),
		}
		if *heartbeatMisses >= 3 {
			logger.Error("hub worker heartbeat failed", attrs...)
		} else {
			logger.Warn("hub worker heartbeat failed", attrs...)
		}
	} else {
		if *heartbeatMisses >= 3 {
			logger.Info(
				"hub worker heartbeat recovered",
				slog.Int("after_consecutive_misses", *heartbeatMisses),
				slog.String("worker_id", sched.WorkerID()),
			)
		}
		*heartbeatMisses = 0
	}

	if n, err := sched.RequeueStaleJobs(ctx, 15*time.Minute); err != nil {
		logger.Warn("stale job reaper failed", slog.String("error", err.Error()))
	} else if n > 0 {
		logger.Info("requeued stale jobs", slog.Int("count", n))
	}

	jobs, err := sched.FetchQueuedJobs(ctx)
	if err != nil {
		logger.Warn("fetch jobs failed", slog.String("error", err.Error()))
		return
	}

	for _, job := range jobs {
		if err := pipe.Process(ctx, job); err != nil {
			logger.Error(
				"job failed",
				slog.String("job_id", job.ID),
				slog.String("domain", job.Domain),
				slog.String("error", err.Error()),
			)
			_ = sched.MarkFailed(ctx, job.ID, err.Error())
			delivery.NotifyJobFailed(ctx, job.ID)
		}
	}
}

func init() {
	if os.Getenv("SYFTIN_ENV") == "" {
		os.Setenv("SYFTIN_ENV", "development")
	}
}
