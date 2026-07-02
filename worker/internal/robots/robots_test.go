package robots

import (
	"testing"
	"time"
)

func TestParseRobotsDisallow(t *testing.T) {
	content := `User-agent: *
Disallow: /admin/
Crawl-delay: 2
Disallow: /private
`
	d := parseRobots(content, "Mozilla/5.0", "/admin/settings")
	if d.Allowed {
		t.Fatal("expected /admin/settings to be disallowed")
	}
	if d.CrawlDelay != 2*time.Second {
		t.Fatalf("expected 2s crawl delay, got %v", d.CrawlDelay)
	}
}

func TestParseRobotsAllowPublicPath(t *testing.T) {
	content := `User-agent: *
Disallow: /admin/
`
	d := parseRobots(content, "Mozilla/5.0", "/jobs/react")
	if !d.Allowed {
		t.Fatalf("expected public path allowed, hit %q", d.DisallowHit)
	}
}
