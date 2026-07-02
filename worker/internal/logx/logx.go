package logx

import (
	"log/slog"
	"os"
	"strings"
)

// Init configures structured logging for hub and edge workers.
func Init() *slog.Logger {
	env := strings.ToLower(os.Getenv("SYFTIN_ENV"))
	if env == "" {
		env = "development"
	}

	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	var handler slog.Handler

	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
