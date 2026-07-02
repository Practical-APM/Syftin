//go:build !windows

package resourceguard

import "time"

func onACPowerWindows() bool {
	return true
}

func userIdleDurationWindows() time.Duration {
	return 0
}
