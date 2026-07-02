package benchmark

import (
	"context"
	"encoding/json"
	"time"

	"github.com/syftin/worker/internal/supabase"
)

type Report struct {
	GeneratedAt      string         `json:"generated_at"`
	TargetCompliance float64        `json:"target_compliance"`
	AverageScore     float64        `json:"average_score"`
	PassedCount      int            `json:"passed_count"`
	TotalCount       int            `json:"total_count"`
	Results          []DomainResult `json:"results"`
}

type DomainResult struct {
	Domain          string   `json:"domain"`
	Name            string   `json:"name"`
	URL             string   `json:"url"`
	Passed          bool     `json:"passed"`
	ComplianceScore float64  `json:"compliance_score"`
	RecordCount     int      `json:"record_count"`
	FetchMethod     string   `json:"fetch_method"`
	TextChars       int      `json:"text_chars"`
	Error           string   `json:"error,omitempty"`
	VarianceFlags   []string `json:"variance_flags,omitempty"`
}

func StoreReport(ctx context.Context, client *supabase.Client, report Report) error {
	if client == nil {
		return nil
	}

	generatedAt := report.GeneratedAt
	if generatedAt == "" {
		generatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	payload, err := json.Marshal(report)
	if err != nil {
		return err
	}

	return client.Post(ctx, "benchmark_reports", map[string]any{
		"generated_at":      generatedAt,
		"target_compliance": report.TargetCompliance,
		"average_score":     report.AverageScore,
		"passed_count":        report.PassedCount,
		"total_count":         report.TotalCount,
		"report":              json.RawMessage(payload),
	}, nil)
}
