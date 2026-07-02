package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	serviceKey string
	http       *http.Client
}

func New(baseURL, serviceKey string) *Client {
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		serviceKey: serviceKey,
		http:       &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) headers() http.Header {
	h := http.Header{}
	h.Set("apikey", c.serviceKey)
	h.Set("Authorization", "Bearer "+c.serviceKey)
	h.Set("Content-Type", "application/json")
	h.Set("Prefer", "return=representation")
	return h
}

func (c *Client) Get(ctx context.Context, path string, query url.Values, dest any) error {
	u := c.baseURL + "/rest/v1/" + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header = c.headers()

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase GET %s: %s", path, string(body))
	}

	if dest == nil {
		return nil
	}
	return json.Unmarshal(body, dest)
}

func (c *Client) PatchRows(ctx context.Context, path string, query url.Values, payload any, dest any) (int, error) {
	u := c.baseURL + "/rest/v1/" + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, u, bytes.NewReader(data))
	if err != nil {
		return 0, err
	}
	req.Header = c.headers()

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return 0, fmt.Errorf("supabase PATCH %s: %s", path, string(body))
	}

	if dest != nil && len(body) > 0 {
		if err := json.Unmarshal(body, dest); err != nil {
			return 0, err
		}
	}

	var arr []json.RawMessage
	_ = json.Unmarshal(body, &arr)
	return len(arr), nil
}

func (c *Client) Upsert(ctx context.Context, path string, payload any) error {
	u := c.baseURL + "/rest/v1/" + path
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(data))
	if err != nil {
		return err
	}
	h := c.headers()
	h.Set("Prefer", "return=minimal,resolution=merge-duplicates")
	req.Header = h

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase UPSERT %s: %s", path, string(body))
	}
	return nil
}

func (c *Client) Patch(ctx context.Context, path string, query url.Values, payload any) error {
	u := c.baseURL + "/rest/v1/" + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, u, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header = c.headers()

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase PATCH %s: %s", path, string(body))
	}
	return nil
}

func (c *Client) Post(ctx context.Context, path string, payload any, dest any) error {
	u := c.baseURL + "/rest/v1/" + path
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header = c.headers()

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase POST %s: %s", path, string(body))
	}

	if dest != nil {
		return json.Unmarshal(body, dest)
	}
	return nil
}
