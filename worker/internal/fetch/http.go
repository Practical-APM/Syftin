package fetch

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func fetchHTTP(ctx context.Context, cfg Config, targetURL string) (string, int, error) {
	client := &http.Client{Timeout: cfg.HTTPTimeout}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return "", 0, err
	}

	req.Header.Set("User-Agent", cfg.UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-IN,en;q=0.9")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := client.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", 0, fmt.Errorf("HTTP %d from %s", resp.StatusCode, targetURL)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return "", 0, err
	}

	html := string(body)
	if len(strings.TrimSpace(html)) == 0 {
		return "", 0, fmt.Errorf("empty response from %s", targetURL)
	}

	return html, len(body), nil
}
