package fetch

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/playwright-community/playwright-go"
)

// fetchPlaywright renders the page in headless Chromium, then closes the browser
// before returning (sequential pipeline: browser → Ollama).
func fetchPlaywright(ctx context.Context, cfg Config, targetURL string) (string, int, error) {
	if err := ctx.Err(); err != nil {
		return "", 0, err
	}
	if consumeRuntimeReset() {
		// Brief yield so Chromium GPU/RAM from a prior session can be reclaimed.
		time.Sleep(200 * time.Millisecond)
	}

	pw, err := playwright.Run()
	if err != nil {
		return "", 0, fmt.Errorf("playwright start: %w (run: bash scripts/install-playwright.sh)", err)
	}
	defer pw.Stop()

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
	})
	if err != nil {
		return "", 0, fmt.Errorf("playwright launch: %w", err)
	}
	defer browser.Close()

	bctx, err := browser.NewContext(playwright.BrowserNewContextOptions{
		UserAgent: playwright.String(cfg.UserAgent),
		Viewport: &playwright.Size{
			Width:  1280,
			Height: 720,
		},
		Locale: playwright.String("en-IN"),
	})
	if err != nil {
		return "", 0, fmt.Errorf("playwright context: %w", err)
	}
	defer bctx.Close()

	page, err := bctx.NewPage()
	if err != nil {
		return "", 0, fmt.Errorf("playwright page: %w", err)
	}

	timeoutMs := float64(cfg.PlaywrightTimeout.Milliseconds())
	page.SetDefaultTimeout(timeoutMs)
	page.SetDefaultNavigationTimeout(timeoutMs)

	_, err = page.Goto(targetURL, playwright.PageGotoOptions{
		WaitUntil: playwright.WaitUntilStateDomcontentloaded,
		Timeout:   playwright.Float(timeoutMs),
	})
	if err != nil {
		return "", 0, fmt.Errorf("playwright navigate: %w", err)
	}

	// Allow client-side hydration (SPAs like naukri.com, blinkit.com).
	waitMs := hydrationWaitMs(domainFromURL(targetURL))
	if remaining := time.Until(deadlineFromContext(ctx, cfg.PlaywrightTimeout)); remaining > 0 {
		if float64(remaining.Milliseconds()) < waitMs {
			waitMs = float64(remaining.Milliseconds()) * 0.5
		}
	}
	if waitMs > 0 {
		if err := page.WaitForTimeout(waitMs); err != nil {
			return "", 0, fmt.Errorf("playwright wait: %w", err)
		}
	}

	content, err := page.Content()
	if err != nil {
		return "", 0, fmt.Errorf("playwright content: %w", err)
	}

	if len(strings.TrimSpace(content)) == 0 {
		return "", 0, fmt.Errorf("empty rendered page from %s", targetURL)
	}

	return content, len(content), nil
}

func deadlineFromContext(ctx context.Context, fallback time.Duration) time.Time {
	if dl, ok := ctx.Deadline(); ok {
		return dl
	}
	return time.Now().Add(fallback)
}

func hydrationWaitMs(domain string) float64 {
	switch strings.TrimPrefix(strings.ToLower(domain), "www.") {
	case "naukri.com", "blinkit.com", "zeptonow.com", "swiggy.com", "zomato.com":
		return 4000
	case "flipkart.com", "amazon.in", "myntra.com":
		return 3500
	default:
		return 2500
	}
}

func domainFromURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")
}
