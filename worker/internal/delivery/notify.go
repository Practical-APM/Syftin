package delivery

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

// NotifyJobCompleted asks the web app to deliver buyer webhooks for a finished job.
func NotifyJobCompleted(ctx context.Context, jobID string) {
	notifyJobDelivery(ctx, jobID, "")
}

// NotifyJobFailed asks the web app to deliver job.failed webhooks.
func NotifyJobFailed(ctx context.Context, jobID string) {
	notifyJobDelivery(ctx, jobID, "job.failed")
}

func notifyJobDelivery(ctx context.Context, jobID, event string) {
	apiURL := strings.TrimRight(os.Getenv("SYFTIN_API_URL"), "/")
	secret := os.Getenv("INTERNAL_DELIVERY_SECRET")
	if apiURL == "" || secret == "" {
		return
	}

	url := fmt.Sprintf("%s/api/internal/jobs/%s/deliver", apiURL, jobID)
	if event != "" {
		url += "?event=" + event
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		slog.Warn("delivery notify request", slog.String("error", err.Error()))
		return
	}
	req.Header.Set("Authorization", "Bearer "+secret)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		slog.Warn("delivery notify failed", slog.String("job_id", jobID), slog.String("error", err.Error()))
		return
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		slog.Warn(
			"delivery notify non-2xx",
			slog.String("job_id", jobID),
			slog.String("event", event),
			slog.Int("status", res.StatusCode),
		)
	}
}
