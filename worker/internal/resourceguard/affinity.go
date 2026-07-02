package resourceguard

import (
	"log/slog"
	"runtime"
)

// applyRuntimeLimits sets GOMAXPROCS and OS-level CPU affinity for the profile.
func applyRuntimeLimits(cfg Config, logger *slog.Logger) {
	if cfg.MaxCPUCores < 1 {
		cfg.MaxCPUCores = 1
	}
	if cfg.MaxCPUCores > runtime.NumCPU() {
		cfg.MaxCPUCores = runtime.NumCPU()
	}
	runtime.GOMAXPROCS(cfg.MaxCPUCores)

	cpus := selectCPUs(cfg)
	if err := setCPUAffinity(cfg.Profile, cpus); err != nil && logger != nil {
		logger.Warn(
			"cpu affinity not applied",
			slog.String("error", err.Error()),
			slog.Int("cores_requested", len(cpus)),
		)
		return
	}
	if logger != nil && len(cpus) > 0 {
		logger.Info(
			"cpu affinity applied",
			slog.String("profile", string(cfg.Profile)),
			slog.Int("gomaxprocs", cfg.MaxCPUCores),
			slog.Any("cpus", cpus),
		)
	}
}

// selectCPUs picks logical CPU IDs for the active profile.
func selectCPUs(cfg Config) []int {
	total := runtime.NumCPU()
	n := cfg.MaxCPUCores
	if n > total {
		n = total
	}
	if n < 1 {
		n = 1
	}

	switch cfg.Profile {
	case ProfileEco:
		if picked := pickEfficiencyCores(n); len(picked) > 0 {
			return picked
		}
	}

	cpus := make([]int, n)
	for i := 0; i < n; i++ {
		cpus[i] = i
	}
	return cpus
}

// pickEfficiencyCores returns up to want low-power CPU indices (OS-specific).
func pickEfficiencyCores(want int) []int {
	return efficiencyCoreIDs(want)
}
