package resourceguard

import "testing"

func TestTaskDelayEcoMinimum(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Profile = ProfileEco
	cfg.MinTaskDelaySec = 10
	tc := NewThermalController(cfg)
	delay := tc.TaskDelay()
	if delay < 10*1e9 {
		t.Fatalf("eco min delay expected >= 10s, got %v", delay)
	}
}

func TestApplyProfileRulesEcoCapsCores(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Profile = ProfileEco
	cfg.MaxCPUCores = 8
	applyProfileRules(&cfg)
	if cfg.MaxCPUCores > 2 {
		t.Fatalf("eco should cap cores to <=2, got %d", cfg.MaxCPUCores)
	}
}

func TestApplyRemoteProfile(t *testing.T) {
	cfg := DefaultConfig()
	ApplyRemote(&cfg, map[string]any{
		"profile":           "titan",
		"maxCpuCores":       6,
		"pauseOnUserActivity": true,
	})
	if cfg.Profile != ProfileTitan {
		t.Fatalf("expected titan, got %s", cfg.Profile)
	}
	if !cfg.PauseOnUserActivity {
		t.Fatal("titan should force pause on activity")
	}
}
