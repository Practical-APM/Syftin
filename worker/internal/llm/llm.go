package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	model   string
	http    *http.Client
}

func New(baseURL, model string) *Client {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	if model == "" {
		model = "qwen2.5:3b-instruct-q4_K_M"
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		http:    &http.Client{Timeout: 180 * time.Second},
	}
}

type ExtractRequest struct {
	PageText      string
	ExampleSchema json.RawMessage
	Domain        string
	PageTitle     string
}

func (c *Client) ExtractJSON(ctx context.Context, req ExtractRequest) (json.RawMessage, error) {
	hint := domainHint(req.Domain)
	prompt := fmt.Sprintf(`You extract structured data from public web page text.

Domain: %s
Vertical hint: %s
Example row (use these exact field names):
%s

Instructions:
1. Return a JSON array of objects — one object per distinct record found on the page.
2. Field names must match the example exactly (same spelling and casing).
3. Infer values only from the page text below — do not invent data.
4. Use null for fields you cannot find.
5. Return [] if the page has no matching records.
6. Do not include emails, phone numbers, or personal identifiers.
7. Prefer multiple records when the page lists several items (jobs, products, listings).

Page text:
%s`, req.Domain, hint, string(req.ExampleSchema), req.PageText)

	payload := map[string]any{
		"model":  c.model,
		"stream": false,
		"format": "json",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a data extraction engine. Output valid JSON only. No markdown.",
			},
			{"role": "user", "content": prompt},
		},
		"options": map[string]any{
			"temperature": 0.1,
			"num_predict": 4096,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/chat",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ollama unreachable at %s: %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("ollama error (%d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("ollama response parse: %w", err)
	}

	content := strings.TrimSpace(result.Message.Content)
	if content == "" {
		return nil, fmt.Errorf("ollama returned empty content")
	}

	return normalizeLLMOutput(content)
}

func normalizeLLMOutput(content string) (json.RawMessage, error) {
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var arr []json.RawMessage
	if err := json.Unmarshal([]byte(content), &arr); err == nil {
		out, err := json.Marshal(arr)
		return out, err
	}

	var wrapper map[string]json.RawMessage
	if err := json.Unmarshal([]byte(content), &wrapper); err == nil {
		for _, key := range []string{"data", "results", "items", "records"} {
			if v, ok := wrapper[key]; ok {
				return v, nil
			}
		}
	}

	var single json.RawMessage
	if err := json.Unmarshal([]byte(content), &single); err != nil {
		return nil, fmt.Errorf("invalid JSON from Ollama: %w", err)
	}
	out, err := json.Marshal([]json.RawMessage{single})
	return out, err
}
