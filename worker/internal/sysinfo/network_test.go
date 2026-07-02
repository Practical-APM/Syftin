package sysinfo

import "testing"

func TestDetectMeteredConnectionDoesNotPanic(t *testing.T) {
	_ = DetectMeteredConnection()
}
