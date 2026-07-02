package config

import (
	"fmt"
	"os"
	"time"

	"github.com/syftin/worker/internal/fetch"
)

// NodeConfig is used by the contributor edge node (cmd/node).
type NodeConfig struct {
	SyftinAPIURL  string
	NodeToken     string
	PollInterval  time.Duration
	Fetch         fetch.Config
	OllamaBaseURL string
	OllamaModel   string
}

// LoadNode loads edge-node settings. Contributors only need SYFTIN_API_URL + NODE_TOKEN.
func LoadNode() (*NodeConfig, error) {
	token := os.Getenv("NODE_TOKEN")
	if token == "" {
		return nil, fmt.Errorf("NODE_TOKEN is required — copy it from Contributor → My devices")
	}

	apiURL := os.Getenv("SYFTIN_API_URL")
	if apiURL == "" {
		apiURL = os.Getenv("NEXT_PUBLIC_SITE_URL")
	}
	if apiURL == "" {
		return nil, fmt.Errorf("SYFTIN_API_URL is required — use your Syftin site URL (e.g. https://syftin.io)")
	}

	cfg := &NodeConfig{
		SyftinAPIURL:  apiURL,
		NodeToken:     token,
		PollInterval:  10 * time.Second,
		Fetch:         fetch.DefaultConfig(fetch.ModeAuto),
		OllamaBaseURL: getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
		OllamaModel:   getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct-q4_K_M"),
	}

	if interval := os.Getenv("NODE_POLL_INTERVAL"); interval != "" {
		d, err := time.ParseDuration(interval)
		if err != nil {
			return nil, fmt.Errorf("invalid NODE_POLL_INTERVAL: %w", err)
		}
		cfg.PollInterval = d
	}

	if mode := os.Getenv("FETCH_MODE"); mode != "" {
		cfg.Fetch = fetch.DefaultConfig(parseFetchMode(mode))
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
