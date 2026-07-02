package resourceguard

import (
	"testing"
	"time"
)

func TestActivityWatcherTitanDetectsRecentInput(t *testing.T) {
	orig := idleDurationProbe
	defer func() { idleDurationProbe = orig }()

	idleDurationProbe = func() time.Duration {
		return 50 * time.Millisecond
	}

	w := NewActivityWatcher(nil)
	cfg := DefaultConfig()
	cfg.Profile = ProfileTitan
	cfg.PauseOnUserActivity = true
	w.ApplyConfig(cfg)
	w.tick(cfg)

	if !w.UserActive() {
		t.Fatal("expected user active when idle < 100ms on Titan")
	}
}

func TestActivityWatcherTitanIgnoresIdleUser(t *testing.T) {
	orig := idleDurationProbe
	defer func() { idleDurationProbe = orig }()

	idleDurationProbe = func() time.Duration {
		return 5 * time.Second
	}

	w := NewActivityWatcher(nil)
	cfg := DefaultConfig()
	cfg.Profile = ProfileTitan
	cfg.PauseOnUserActivity = true
	w.ApplyConfig(cfg)
	w.tick(cfg)

	if w.UserActive() {
		t.Fatal("expected user inactive when idle > 100ms on Titan")
	}
}

func TestActivityWatcherBalancedUsesIdleThreshold(t *testing.T) {
	orig := idleDurationProbe
	defer func() { idleDurationProbe = orig }()

	idleDurationProbe = func() time.Duration {
		return 30 * time.Second
	}

	w := NewActivityWatcher(nil)
	cfg := DefaultConfig()
	cfg.Profile = ProfileBalanced
	cfg.IdleThresholdSec = 120
	cfg.PauseOnUserActivity = true
	w.ApplyConfig(cfg)
	w.tick(cfg)

	if w.UserActive() {
		t.Fatal("expected inactive when idle below 120s threshold")
	}

	idleDurationProbe = func() time.Duration {
		return 10 * time.Second
	}
	w.tick(cfg)
	if !w.UserActive() {
		t.Fatal("expected active when idle < 120s threshold")
	}
}

func TestActivityWatcherDisabledClearsActive(t *testing.T) {
	w := NewActivityWatcher(nil)
	w.active.Store(true)
	cfg := DefaultConfig()
	cfg.PauseOnUserActivity = false
	w.ApplyConfig(cfg)
	w.tick(cfg)
	if w.UserActive() {
		t.Fatal("expected inactive when pause on activity is off")
	}
}
