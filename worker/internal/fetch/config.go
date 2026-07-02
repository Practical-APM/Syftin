package fetch

import "time"

type Mode string

const (
	ModeAuto       Mode = "auto"
	ModeHTTP       Mode = "http"
	ModePlaywright Mode = "playwright"
)

const defaultUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// MinTextCharsForHTTP is the extracted text length below which auto mode retries with Playwright.
const MinTextCharsForHTTP = 50

type Config struct {
	Mode              Mode
	PlaywrightTimeout time.Duration
	HTTPTimeout       time.Duration
	UserAgent         string
}

func DefaultConfig(mode Mode) Config {
	if mode == "" {
		mode = ModeAuto
	}
	return Config{
		Mode:              mode,
		PlaywrightTimeout: 45 * time.Second,
		HTTPTimeout:       45 * time.Second,
		UserAgent:         defaultUserAgent,
	}
}
