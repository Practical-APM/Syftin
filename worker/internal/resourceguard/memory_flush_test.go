package resourceguard

import "testing"

func TestGpuVRAMLimitGBProfilePercent(t *testing.T) {
	g := &Guard{
		gpuVRAMGB: 8,
		cfg: Config{
			Profile:  ProfileBalanced,
			MaxRAMMB: 6144,
		},
	}
	limit := g.gpuVRAMLimitGB()
	if limit != 4 {
		t.Fatalf("expected 4GB balanced cap on 8GB GPU, got %v", limit)
	}

	g.cfg.Profile = ProfileEco
	if g.gpuVRAMLimitGB() != 2 {
		t.Fatalf("expected 2GB eco cap")
	}
}

func TestApplySystemProfileCapsRAM(t *testing.T) {
	cfg := DefaultConfig()
	cfg.MaxRAMMB = 8192
	ApplySystemProfileCaps(&cfg, 8, 8)
	if cfg.MaxRAMMB != 4096 {
		t.Fatalf("balanced should cap at 50%% of 8GB = 4096MB, got %d", cfg.MaxRAMMB)
	}
}

func TestFlushVolatileMemoryNoPanic(t *testing.T) {
	flushVolatileMemory()
}
