package extract

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/syftin/worker/internal/fetch"
	"github.com/syftin/worker/internal/llm"
	"github.com/syftin/worker/internal/retry"
	"github.com/syftin/worker/internal/robots"
	"github.com/syftin/worker/internal/validate"
)

const defaultUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

type Config struct {
	Fetch         fetch.Config
	OllamaBaseURL string
	OllamaModel   string
}

type Result struct {
	ComplianceScore float64
	RecordCount     int
	VarianceFlags   []string
	Output          json.RawMessage
	FetchMethod     string
	TextChars       int
}

type Runner struct {
	fetch     *fetch.Client
	llm       *llm.Client
	rateLimit *fetch.DomainRateLimit
}

func NewRunner(cfg Config) *Runner {
	return &Runner{
		fetch:     fetch.New(cfg.Fetch),
		llm:       llm.New(cfg.OllamaBaseURL, cfg.OllamaModel),
		rateLimit: fetch.NewDomainRateLimit(5 * time.Second),
	}
}

func (r *Runner) Extract(
	ctx context.Context,
	targetURL, domain string,
	exampleSchema json.RawMessage,
) (Result, error) {
	decision, err := robots.Check(ctx, targetURL, defaultUserAgent)
	if err != nil {
		return Result{}, fmt.Errorf("robots: %w", err)
	}
	if !decision.Allowed {
		return Result{}, fmt.Errorf("robots: path blocked by %q (%s)", decision.DisallowHit, decision.RobotsURL)
	}
	if decision.CrawlDelay > 0 {
		robots.Wait(decision.CrawlDelay)
	}

	r.rateLimit.Wait(domain)

	var html string
	var method string

	fetchErr := retry.Do(3, 2*time.Second, func() error {
		var n int
		var err error
		html, n, method, err = r.fetch.FetchHTML(ctx, targetURL)
		_ = n
		return err
	})
	if fetchErr != nil {
		return Result{}, fmt.Errorf("fetch: %w", fetchErr)
	}

	pageText := fetch.ExtractTextContent(redactPII(html))
	textChars := len(strings.TrimSpace(pageText))
	if textChars < fetch.MinTextCharsForHTTP {
		return Result{}, fmt.Errorf(
			"fetch: page text too short (%d chars) after %s",
			textChars, method,
		)
	}

	var output json.RawMessage
	llmErr := retry.Do(2, 3*time.Second, func() error {
		var err error
		output, err = r.llm.ExtractJSON(ctx, llm.ExtractRequest{
			PageText:      pageText,
			ExampleSchema: exampleSchema,
			Domain:        domain,
		})
		return err
	})
	if llmErr != nil {
		return Result{}, fmt.Errorf("ollama: %w", llmErr)
	}

	compliance, err := validate.SchemaCompliance(exampleSchema, redactPIIBytes(output))
	if err != nil {
		return Result{}, fmt.Errorf("validate: %w", err)
	}

	return Result{
		ComplianceScore: compliance.Score,
		RecordCount:     compliance.RecordCount,
		VarianceFlags:   compliance.VarianceFlags,
		Output:          redactPIIBytes(output),
		FetchMethod:     method,
		TextChars:       textChars,
	}, nil
}

// ExtractFromHTML runs LLM + validation on HTML already fetched by an edge node.
func (r *Runner) ExtractFromHTML(
	ctx context.Context,
	html, domain string,
	exampleSchema json.RawMessage,
) (Result, error) {
	pageText := fetch.ExtractTextContent(redactPII(html))
	textChars := len(strings.TrimSpace(pageText))
	if textChars < fetch.MinTextCharsForHTTP {
		return Result{}, fmt.Errorf(
			"edge html text too short (%d chars)",
			textChars,
		)
	}

	var output json.RawMessage
	llmErr := retry.Do(2, 3*time.Second, func() error {
		var err error
		output, err = r.llm.ExtractJSON(ctx, llm.ExtractRequest{
			PageText:      pageText,
			ExampleSchema: exampleSchema,
			Domain:        domain,
		})
		return err
	})
	if llmErr != nil {
		return Result{}, fmt.Errorf("ollama: %w", llmErr)
	}

	compliance, err := validate.SchemaCompliance(exampleSchema, redactPIIBytes(output))
	if err != nil {
		return Result{}, fmt.Errorf("validate: %w", err)
	}

	return Result{
		ComplianceScore: compliance.Score,
		RecordCount:     compliance.RecordCount,
		VarianceFlags:   compliance.VarianceFlags,
		Output:          redactPIIBytes(output),
		FetchMethod:     "edge",
		TextChars:       textChars,
	}, nil
}

// ResultFromParsed validates edge-parsed JSON from a contributor GPU node.
func (r *Runner) ResultFromParsed(
	_ context.Context,
	parsed json.RawMessage,
	exampleSchema json.RawMessage,
) (Result, error) {
	compliance, err := validate.SchemaCompliance(exampleSchema, redactPIIBytes(parsed))
	if err != nil {
		return Result{}, fmt.Errorf("validate: %w", err)
	}

	return Result{
		ComplianceScore: compliance.Score,
		RecordCount:     compliance.RecordCount,
		VarianceFlags:   compliance.VarianceFlags,
		Output:          redactPIIBytes(parsed),
		FetchMethod:     "edge-gpu",
		TextChars:       0,
	}, nil
}
