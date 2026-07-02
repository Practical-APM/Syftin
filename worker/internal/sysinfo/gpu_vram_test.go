package sysinfo

import "testing"

func TestNvidiaVRAMUsedNoPanic(t *testing.T) {
	_, _ = NvidiaVRAMUsedGB()
}
