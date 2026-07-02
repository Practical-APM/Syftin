package sysinfo

import "testing"

func TestInferenceReady(t *testing.T) {
	if !InferenceReady(4) {
		t.Fatal("4GB should be ready")
	}
	if InferenceReady(3.9) {
		t.Fatal("3.9GB should not be ready")
	}
}

func TestProbeGPUNoPanic(t *testing.T) {
	info := probeGPU()
	_ = info
}
