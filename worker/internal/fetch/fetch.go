package fetch

import (
	"context"
	"fmt"
	"strings"
)

// Client fetches page HTML from the host machine (no proxy).
type Client struct {
	cfg Config
}

func New(cfg Config) *Client {
	return &Client{cfg: cfg}
}

// FetchHTML returns HTML, byte count, and the method used ("http" or "playwright").
func (c *Client) FetchHTML(ctx context.Context, targetURL string) (string, int, string, error) {
	switch c.cfg.Mode {
	case ModeHTTP:
		html, n, err := fetchHTTP(ctx, c.cfg, targetURL)
		return html, n, "http", err
	case ModePlaywright:
		html, n, err := fetchPlaywright(ctx, c.cfg, targetURL)
		return html, n, "playwright", err
	case ModeAuto:
		return c.fetchAuto(ctx, targetURL)
	default:
		return "", 0, "", fmt.Errorf("unknown fetch mode %q", c.cfg.Mode)
	}
}

func (c *Client) fetchAuto(ctx context.Context, targetURL string) (string, int, string, error) {
	html, n, err := fetchHTTP(ctx, c.cfg, targetURL)
	if err == nil {
		text := ExtractTextContent(html)
		if len(strings.TrimSpace(text)) >= MinTextCharsForHTTP {
			return html, n, "http", nil
		}
	}

	// HTTP failed or returned a JS shell — render with Playwright.
	pwHTML, pwN, pwErr := fetchPlaywright(ctx, c.cfg, targetURL)
	if pwErr != nil {
		if err != nil {
			return "", 0, "", fmt.Errorf("http: %v; playwright: %w", err, pwErr)
		}
		return "", 0, "", fmt.Errorf("playwright: %w", pwErr)
	}
	return pwHTML, pwN, "playwright", nil
}
