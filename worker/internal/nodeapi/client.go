package nodeapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/syftin/worker/internal/resourceguard"
	"github.com/syftin/worker/internal/sysinfo"
)

type FetchTask struct {
	ID            string          `json:"id"`
	JobID         string          `json:"job_id"`
	TargetURL     string          `json:"target_url"`
	Domain        string          `json:"domain"`
	Status        string          `json:"status"`
	ExampleSchema json.RawMessage `json:"example_schema"`
}

type RegisterResult struct {
	ResourceSettings map[string]any
}

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

func New(baseURL, token string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http:    &http.Client{Timeout: 90 * time.Second},
	}
}

func (c *Client) Register(ctx context.Context, hostname string, caps sysinfo.Capabilities, telemetry *resourceguard.Telemetry) (*RegisterResult, error) {
	payload := map[string]any{
		"hostname":           hostname,
		"capabilities":       caps,
		"connection_metered": caps.ConnectionMetered,
	}
	if telemetry != nil {
		payload["resource_telemetry"] = telemetry
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	var out struct {
		OK               bool           `json:"ok"`
		ResourceSettings map[string]any `json:"resource_settings"`
	}
	if _, err := c.do(ctx, http.MethodPost, "/api/node/register", body, &out); err != nil {
		return nil, err
	}
	return &RegisterResult{ResourceSettings: out.ResourceSettings}, nil
}

func (c *Client) ReportTelemetry(ctx context.Context, hostname string, telemetry resourceguard.Telemetry) error {
	body, err := json.Marshal(map[string]any{
		"hostname":            hostname,
		"resource_telemetry":  telemetry,
		"connection_metered":  telemetry.ConnectionMetered,
	})
	if err != nil {
		return err
	}
	_, err = c.do(ctx, http.MethodPost, "/api/node/telemetry", body, nil)
	return err
}

func ApplyResourceSettings(remote map[string]any) resourceguard.Config {
	cfg := resourceguard.Load()
	resourceguard.ApplyRemote(&cfg, remote)
	_ = resourceguard.SaveJSON(cfg)
	return cfg
}

func (c *Client) ClaimTask(ctx context.Context, hostname string) (*FetchTask, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/node/tasks/claim", nil)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req, hostname)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("claim task: %s", string(raw))
	}

	var out struct {
		Task *FetchTask `json:"task"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out.Task, nil
}

func (c *Client) CompleteTask(ctx context.Context, taskID, html string) error {
	return c.CompleteTaskWithInference(ctx, taskID, html, nil, false, "")
}

func (c *Client) CompleteTaskWithInference(
	ctx context.Context,
	taskID, html string,
	parsedOutput json.RawMessage,
	edgeInference bool,
	inferenceModel string,
) error {
	payload := map[string]any{"html": html}
	if edgeInference && len(parsedOutput) > 0 {
		var parsed any
		if err := json.Unmarshal(parsedOutput, &parsed); err == nil {
			payload["parsed_output"] = parsed
			payload["edge_inference"] = true
			if inferenceModel != "" {
				payload["inference_model"] = inferenceModel
			}
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = c.do(ctx, http.MethodPost, "/api/node/tasks/"+taskID+"/complete", body, nil)
	return err
}

func (c *Client) FailTask(ctx context.Context, taskID, message string) error {
	body, err := json.Marshal(map[string]any{
		"failed": true,
		"error":  message,
	})
	if err != nil {
		return err
	}
	_, err = c.do(ctx, http.MethodPost, "/api/node/tasks/"+taskID+"/complete", body, nil)
	return err
}

func (c *Client) do(ctx context.Context, method, path string, body []byte, dest any) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	c.setHeaders(req, "")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("%s %s: %s", method, path, string(raw))
	}
	if dest != nil {
		if err := json.Unmarshal(raw, dest); err != nil {
			return nil, err
		}
	}
	return raw, nil
}

func (c *Client) setHeaders(req *http.Request, hostname string) {
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	if hostname != "" {
		req.Header.Set("x-node-hostname", hostname)
	}
}
