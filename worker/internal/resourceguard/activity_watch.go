package resourceguard

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"
)

const (
	titanActiveThreshold = 100 * time.Millisecond
	titanPollInterval    = 50 * time.Millisecond
	defaultPollInterval  = 500 * time.Millisecond
)

// idleDurationProbe is swappable in tests.
var idleDurationProbe = userIdleDuration

// ActivityWatcher polls input idle time and flags active use within ~100ms on Titan.
type ActivityWatcher struct {
	logger *slog.Logger

	mu           sync.Mutex
	cfg          Config
	active       atomic.Bool
	stop         chan struct{}
	done         chan struct{}
	pollInterval time.Duration
}

func NewActivityWatcher(logger *slog.Logger) *ActivityWatcher {
	return &ActivityWatcher{
		logger:       logger,
		stop:         make(chan struct{}),
		done:         make(chan struct{}),
		pollInterval: titanPollInterval,
	}
}

func (w *ActivityWatcher) ApplyConfig(cfg Config) {
	w.mu.Lock()
	w.cfg = cfg
	if cfg.PauseOnUserActivity {
		w.pollInterval = w.pollIntervalFor(cfg)
	}
	w.mu.Unlock()
	if !cfg.PauseOnUserActivity {
		w.active.Store(false)
	}
}

func (w *ActivityWatcher) Start() {
	go w.loop()
}

func (w *ActivityWatcher) Stop() {
	select {
	case <-w.stop:
		return
	default:
		close(w.stop)
	}
	<-w.done
}

func (w *ActivityWatcher) UserActive() bool {
	return w.active.Load()
}

func (w *ActivityWatcher) loop() {
	defer close(w.done)
	var ticker *time.Ticker
	defer func() {
		if ticker != nil {
			ticker.Stop()
		}
	}()

	for {
		cfg := w.config()
		if !cfg.PauseOnUserActivity {
			w.active.Store(false)
			if ticker != nil {
				ticker.Stop()
				ticker = nil
			}
			select {
			case <-w.stop:
				return
			case <-time.After(defaultPollInterval):
			}
			continue
		}

		interval := w.pollIntervalFor(cfg)
		if ticker == nil || interval != w.pollInterval {
			if ticker != nil {
				ticker.Stop()
			}
			ticker = time.NewTicker(interval)
			w.pollInterval = interval
		}

		select {
		case <-w.stop:
			return
		case <-ticker.C:
			w.tick(w.config())
		}
	}
}

func (w *ActivityWatcher) config() Config {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.cfg
}

func (w *ActivityWatcher) pollIntervalFor(cfg Config) time.Duration {
	if cfg.Profile == ProfileTitan {
		return titanPollInterval
	}
	return defaultPollInterval
}

func (w *ActivityWatcher) activeThreshold(cfg Config) time.Duration {
	if cfg.Profile == ProfileTitan {
		return titanActiveThreshold
	}
	sec := cfg.IdleThresholdSec
	if sec < 1 {
		sec = 120
	}
	return time.Duration(sec) * time.Second
}

func (w *ActivityWatcher) tick(cfg Config) {
	if !cfg.PauseOnUserActivity {
		w.active.Store(false)
		return
	}
	idle := idleDurationProbe()
	if idle == 0 {
		return
	}
	active := idle < w.activeThreshold(cfg)
	prev := w.active.Swap(active)
	if active && !prev && w.logger != nil {
		w.logger.Info(
			"user activity detected — yielding",
			slog.String("profile", string(cfg.Profile)),
			slog.Duration("idle", idle),
		)
	}
}

// WorkContext returns a context cancelled when the user becomes active (Titan only).
func (w *ActivityWatcher) WorkContext(parent context.Context, cfg Config) (context.Context, context.CancelFunc) {
	if !cfg.PauseOnUserActivity || cfg.Profile != ProfileTitan {
		return parent, func() {}
	}

	ctx, cancel := context.WithCancel(parent)
	go func() {
		ticker := time.NewTicker(titanPollInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-w.stop:
				return
			case <-ticker.C:
				if w.UserActive() {
					cancel()
					return
				}
			}
		}
	}()
	return ctx, cancel
}
