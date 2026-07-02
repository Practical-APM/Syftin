//go:build windows

package resourceguard

import "testing"

func TestUserIdleDurationWindows(t *testing.T) {
	idle := userIdleDurationWindows()
	if idle < 0 {
		t.Fatalf("idle must be non-negative, got %v", idle)
	}
}

func TestOnACPowerWindows(t *testing.T) {
	_ = onACPowerWindows()
}
