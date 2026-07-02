package resourceguard

import "testing"

func TestGPUInferenceAllowed(t *testing.T) {
	if GPUInferenceAllowed(true, 8, true) != true {
		t.Fatal("expected 8GB GPU to allow inference")
	}
	if GPUInferenceAllowed(true, 2, true) != false {
		t.Fatal("expected 2GB GPU to block inference")
	}
	if GPUInferenceAllowed(false, 8, true) != false {
		t.Fatal("expected no GPU to block inference")
	}
}

func TestReconcileGPUInference(t *testing.T) {
	cfg := DefaultConfig()
	cfg.EnableGPUInference = true
	ReconcileGPUInference(&cfg, true, 2)
	if cfg.EnableGPUInference {
		t.Fatal("expected inference disabled for low VRAM")
	}
}
