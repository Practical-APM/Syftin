package robots

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Decision struct {
	Allowed     bool
	CrawlDelay  time.Duration
	RobotsURL   string
	DisallowHit string
}

// Check fetches robots.txt for the target host and returns crawl rules.
// Uses a simple line parser (not a full robots spec implementation).
func Check(ctx context.Context, targetURL, userAgent string) (Decision, error) {
	u, err := url.Parse(targetURL)
	if err != nil {
		return Decision{}, err
	}

	robotsURL := fmt.Sprintf("%s://%s/robots.txt", u.Scheme, u.Host)
	decision := Decision{Allowed: true, RobotsURL: robotsURL}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, robotsURL, nil)
	if err != nil {
		return decision, nil
	}
	req.Header.Set("User-Agent", userAgent)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if resp != nil {
			resp.Body.Close()
		}
		return decision, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return decision, nil
	}

	return parseRobots(string(body), userAgent, u.Path), nil
}

func parseRobots(content, userAgent, path string) Decision {
	d := Decision{Allowed: true}
	lines := strings.Split(content, "\n")
	activeAgents := map[string]bool{"*": true}
	maxDelay := time.Duration(0)
	disallowRules := []string{}

	for _, raw := range lines {
		line := strings.TrimSpace(strings.Split(raw, "#")[0])
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(strings.ToLower(parts[0]))
		val := strings.TrimSpace(parts[1])

		switch key {
		case "user-agent":
			activeAgents = map[string]bool{}
			agent := strings.ToLower(val)
			activeAgents[agent] = true
			if agent == "*" {
				activeAgents["*"] = true
			}
		case "disallow":
			if matchesAgent(activeAgents, userAgent) && val != "" {
				disallowRules = append(disallowRules, val)
			}
		case "crawl-delay":
			if !matchesAgent(activeAgents, userAgent) {
				continue
			}
			if secs, err := strconv.ParseFloat(val, 64); err == nil {
				delay := time.Duration(secs * float64(time.Second))
				if delay > maxDelay {
					maxDelay = delay
				}
			}
		}
	}

	d.CrawlDelay = maxDelay
	for _, rule := range disallowRules {
		if pathMatches(path, rule) {
			d.Allowed = false
			d.DisallowHit = rule
			return d
		}
	}
	return d
}

func matchesAgent(active map[string]bool, ua string) bool {
	if active["*"] {
	 return true
	}
	ual := strings.ToLower(ua)
	for agent := range active {
		if strings.Contains(ual, agent) {
			return true
		}
	}
	return len(active) == 0
}

func pathMatches(path, rule string) bool {
	if rule == "" || rule == "/" {
		return false
	}
	if strings.HasSuffix(rule, "*") {
		return strings.HasPrefix(path, strings.TrimSuffix(rule, "*"))
	}
	return strings.HasPrefix(path, rule)
}

func Wait(delay time.Duration) {
	if delay <= 0 {
		return
	}
	time.Sleep(delay)
}
