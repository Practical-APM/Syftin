package resourceguard

import "testing"

func TestSelectCPUsBalancedUsesLowIndices(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Profile = ProfileBalanced
	cfg.MaxCPUCores = 3

	cpus := selectCPUs(cfg)
	if len(cpus) != 3 {
		t.Fatalf("expected 3 cpus, got %v", cpus)
	}
	for i, c := range cpus {
		if c != i {
			t.Fatalf("expected cpu %d, got %d", i, c)
		}
	}
}

func TestSelectCPUsEcoFallsBackToLowIndices(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Profile = ProfileEco
	cfg.MaxCPUCores = 2

	cpus := selectCPUs(cfg)
	if len(cpus) != 2 {
		t.Fatalf("expected 2 cpus, got %v", cpus)
	}
}
