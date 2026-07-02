package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"github.com/syftin/worker/internal/benchmark"
	"github.com/syftin/worker/internal/config"
	"github.com/syftin/worker/internal/extract"
	"github.com/syftin/worker/internal/llm"
	"github.com/syftin/worker/internal/supabase"
)

type benchmarkFile struct {
	TargetCompliance float64 `json:"target_compliance"`
	Domains          []struct {
		Domain string          `json:"domain"`
		Name   string          `json:"name"`
		URL    string          `json:"url"`
		Schema json.RawMessage `json:"schema"`
	} `json:"domains"`
}

type domainResult struct {
	Domain           string  `json:"domain"`
	Name             string  `json:"name"`
	URL              string  `json:"url"`
	Passed           bool    `json:"passed"`
	ComplianceScore  float64 `json:"compliance_score"`
	RecordCount      int     `json:"record_count"`
	FetchMethod      string  `json:"fetch_method"`
	TextChars        int     `json:"text_chars"`
	Error            string  `json:"error,omitempty"`
	VarianceFlags    []string `json:"variance_flags,omitempty"`
}

type benchmarkReport struct {
	GeneratedAt      string         `json:"generated_at"`
	TargetCompliance float64        `json:"target_compliance"`
	AverageScore     float64        `json:"average_score"`
	PassedCount      int            `json:"passed_count"`
	TotalCount       int            `json:"total_count"`
	Results          []domainResult `json:"results"`
}

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := llm.ModelAvailable(context.Background(), cfg.OllamaBaseURL, cfg.OllamaModel); err != nil {
		log.Fatalf("ollama: %v", err)
	}

	configPath := getenv("BENCHMARK_CONFIG", "benchmarks/domains.json")
	data, err := os.ReadFile(configPath)
	if err != nil {
		log.Fatalf("read config: %v", err)
	}

	var spec benchmarkFile
	if err := json.Unmarshal(data, &spec); err != nil {
		log.Fatalf("parse config: %v", err)
	}

	runner := extract.NewRunner(extract.Config{
		Fetch:         cfg.Fetch,
		OllamaBaseURL: cfg.OllamaBaseURL,
		OllamaModel:   cfg.OllamaModel,
	})

	ctx := context.Background()
	report := benchmarkReport{
		GeneratedAt:      time.Now().UTC().Format(time.RFC3339),
		TargetCompliance: spec.TargetCompliance,
		TotalCount:       len(spec.Domains),
	}

	var scoreSum float64

	for _, item := range spec.Domains {
		log.Printf("benchmarking %s (%s)", item.Domain, item.URL)
		res := domainResult{
			Domain: item.Domain,
			Name:   item.Name,
			URL:    item.URL,
		}

		result, err := runner.Extract(ctx, item.URL, item.Domain, item.Schema)
		if err != nil {
			res.Error = err.Error()
			scoreSum += 0
			log.Printf("  FAIL: %v", err)
		} else {
			res.ComplianceScore = result.ComplianceScore
			res.RecordCount = result.RecordCount
			res.FetchMethod = result.FetchMethod
			res.TextChars = result.TextChars
			res.VarianceFlags = result.VarianceFlags
			res.Passed = result.ComplianceScore >= spec.TargetCompliance
			scoreSum += result.ComplianceScore
			if res.Passed {
				report.PassedCount++
			}
			log.Printf("  %.1f%% (%d records) via %s", result.ComplianceScore, result.RecordCount, result.FetchMethod)
		}

		report.Results = append(report.Results, res)
	}

	if report.TotalCount > 0 {
		report.AverageScore = scoreSum / float64(report.TotalCount)
	}

	outDir := getenv("BENCHMARK_OUTPUT_DIR", "benchmarks/results")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		log.Fatalf("mkdir: %v", err)
	}

	outPath := filepath.Join(outDir, "latest.json")
	encoded, _ := json.MarshalIndent(report, "", "  ")
	if err := os.WriteFile(outPath, encoded, 0o644); err != nil {
		log.Fatalf("write report: %v", err)
	}

	fmt.Printf("\nBenchmark complete: %d/%d passed (avg %.1f%%, target %.0f%%)\n",
		report.PassedCount, report.TotalCount, report.AverageScore, spec.TargetCompliance)
	fmt.Printf("Report: %s\n", outPath)

	supaClient := supabase.New(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	storeReport := benchmark.Report{
		GeneratedAt:      report.GeneratedAt,
		TargetCompliance: report.TargetCompliance,
		AverageScore:     report.AverageScore,
		PassedCount:      report.PassedCount,
		TotalCount:       report.TotalCount,
		Results:          make([]benchmark.DomainResult, len(report.Results)),
	}
	for i, r := range report.Results {
		storeReport.Results[i] = benchmark.DomainResult{
			Domain:          r.Domain,
			Name:            r.Name,
			URL:             r.URL,
			Passed:          r.Passed,
			ComplianceScore: r.ComplianceScore,
			RecordCount:     r.RecordCount,
			FetchMethod:     r.FetchMethod,
			TextChars:       r.TextChars,
			Error:           r.Error,
			VarianceFlags:   r.VarianceFlags,
		}
	}
	if err := benchmark.StoreReport(ctx, supaClient, storeReport); err != nil {
		log.Printf("supabase benchmark store: %v (local file still saved)", err)
	} else {
		log.Printf("benchmark report stored in Supabase")
	}

	if report.PassedCount < report.TotalCount {
		os.Exit(1)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
