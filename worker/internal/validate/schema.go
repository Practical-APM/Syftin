package validate

import (
	"encoding/json"
	"fmt"
)

type Result struct {
	Score         float64
	RecordCount   int
	VarianceFlags []string
}

func SchemaCompliance(exampleSchema json.RawMessage, output json.RawMessage) (Result, error) {
	var example map[string]any
	if err := json.Unmarshal(exampleSchema, &example); err != nil {
		return Result{}, fmt.Errorf("invalid example schema: %w", err)
	}

	expectedKeys := make([]string, 0, len(example))
	for k := range example {
		expectedKeys = append(expectedKeys, k)
	}

	var records []map[string]any
	if err := json.Unmarshal(output, &records); err != nil {
		var single map[string]any
		if err2 := json.Unmarshal(output, &single); err2 != nil {
			return Result{}, fmt.Errorf("invalid output JSON: %w", err)
		}
		records = []map[string]any{single}
	}

	if len(records) == 0 {
		return Result{Score: 0, RecordCount: 0, VarianceFlags: []string{"empty_output"}}, nil
	}

	totalChecks := 0
	passedChecks := 0
	flags := []string{}

	for i, record := range records {
		for _, key := range expectedKeys {
			totalChecks++
			if _, ok := record[key]; ok {
				passedChecks++
			} else {
				flags = append(flags, fmt.Sprintf("record_%d_missing_%s", i, key))
			}
		}
	}

	score := 0.0
	if totalChecks > 0 {
		score = float64(passedChecks) / float64(totalChecks) * 100
	}

	return Result{
		Score:         score,
		RecordCount:   len(records),
		VarianceFlags: flags,
	}, nil
}
