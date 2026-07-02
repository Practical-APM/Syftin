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
	"github.com/syftin/worker/internal/logx"
	"github.com/syftin/worker/internal/nodeworker"
	"github.com/syftin/worker/internal/resourceguard"
)

func main() {
	_ = godotenv.Load()
	logger := logx.Init()

	cfg, err := config.LoadNode()
	if err != nil {
		logger.Error("config load failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	guard := resourceguard.NewGuard(logger)
	defer guard.Stop()

	node, err := nodeworker.New(cfg, guard)
	if err != nil {
		logger.Error("node init failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	logger.Info(
		"edge node starting",
		slog.String("api_url", cfg.SyftinAPIURL),
		slog.Duration("poll_interval", cfg.PollInterval),
		slog.String("resource_profile", string(guard.Config().Profile)),
	)

	if err := node.Register(ctx); err != nil {
		logger.Warn("initial register failed", slog.String("error", err.Error()))
	}

	pollTicker := time.NewTicker(cfg.PollInterval)
	defer pollTicker.Stop()

	statusTicker := time.NewTicker(2 * time.Second)
	defer statusTicker.Stop()

	run := func() {
		if err := node.RunOnce(ctx); err != nil {
			logger.Warn("node cycle failed", slog.String("error", err.Error()))
		}
	}

	run()
	
	eventCh := make(chan string)
	go func() {
		for {
			if ctx.Err() != nil {
				return
			}
			err := node.ListenForTasks(ctx, eventCh)
			if err != nil && ctx.Err() == nil {
				logger.Warn("sse stream disconnected, reconnecting in 5s", slog.String("error", err.Error()))
				time.Sleep(5 * time.Second)
			}
		}
	}()
	for {
		select {
		case <-ctx.Done():
			logger.Info("edge node shutting down")
			return
		case <-statusTicker.C:
			node.RefreshMetered()
			node.LogGuardStatus()
			node.ReportTelemetry(ctx)
		case event := <-eventCh:
			if event == "task_ready" {
				run()
			}
		case <-pollTicker.C:
			run()
		}
	}
}

func init() {
	if os.Getenv("SYFTIN_ENV") == "" {
		os.Setenv("SYFTIN_ENV", "development")
	}
}
