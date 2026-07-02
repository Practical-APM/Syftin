package fetch

import (
	"strings"
	"testing"
)

func TestJSShellBelowTextThreshold(t *testing.T) {
	shell := `<html><head></head><body><div id="root"></div><script src="/app.js"></script></body></html>`
	text := ExtractTextContent(shell)
	if len(strings.TrimSpace(text)) >= MinTextCharsForHTTP {
		t.Fatalf("JS shell should be below threshold, got %d chars: %q", len(text), text)
	}
}

func TestStaticPageAboveTextThreshold(t *testing.T) {
	html := `<html><body><p>` + strings.Repeat("Product listing data here. ", 20) + `</p></body></html>`
	text := ExtractTextContent(html)
	if len(strings.TrimSpace(text)) < MinTextCharsForHTTP {
		t.Fatalf("static page should exceed threshold, got %d chars", len(text))
	}
}

func TestParseFetchModeDefault(t *testing.T) {
	cfg := DefaultConfig("")
	if cfg.Mode != ModeAuto {
		t.Fatalf("expected auto mode, got %q", cfg.Mode)
	}
}
