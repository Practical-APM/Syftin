package config

import (
	"fmt"
	"os"
	"time"

	"github.com/syftin/worker/internal/fetch"
)

type Config struct {
	SupabaseURL        string
	SupabaseServiceKey string
	OllamaBaseURL      string
	OllamaModel        string
	PollInterval       time.Duration
	WorkerID           string
	Fetch              fetch.Config
}

func Load() (*Config, error) {
	cfg := &Config{
		SupabaseURL:        os.Getenv("SUPABASE_URL"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		OllamaBaseURL:      getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
		OllamaModel:        getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct-q4_K_M"),
		PollInterval:       10 * time.Second,
		WorkerID:           os.Getenv("WORKER_ID"),
		Fetch:              fetch.DefaultConfig(parseFetchMode(os.Getenv("FETCH_MODE"))),
	}

	if cfg.SupabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is required")
	}
	if cfg.SupabaseServiceKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is required")
	}
	if cfg.WorkerID == "" {
		cfg.WorkerID = "local-m2-worker"
	}

	if interval := os.Getenv("POLL_INTERVAL"); interval != "" {
		d, err := time.ParseDuration(interval)
		if err != nil {
			return nil, fmt.Errorf("invalid POLL_INTERVAL: %w", err)
		}
		cfg.PollInterval = d
	}

	if timeout := os.Getenv("PLAYWRIGHT_TIMEOUT"); timeout != "" {
		d, err := time.ParseDuration(timeout)
		if err != nil {
			return nil, fmt.Errorf("invalid PLAYWRIGHT_TIMEOUT: %w", err)
		}
		cfg.Fetch.PlaywrightTimeout = d
		cfg.Fetch.HTTPTimeout = d
	}

	return cfg, nil
}

func parseFetchMode(raw string) fetch.Mode {
	switch raw {
	case "http":
		return fetch.ModeHTTP
	case "playwright":
		return fetch.ModePlaywright
	default:
		return fetch.ModeAuto
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
