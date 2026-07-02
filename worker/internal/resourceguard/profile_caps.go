package resourceguard

// ApplySystemProfileCaps clamps CPU/RAM to profile envelopes using live hardware stats.
func ApplySystemProfileCaps(cfg *Config, ramGB float64, cpuCores int) {
	if cpuCores < 1 {
		cpuCores = 1
	}
	applyProfileRules(cfg)

	if ramGB > 0 {
		capMb := int(ramGB * 1024 * profileVRAMPercent(cfg.Profile))
		if capMb < 512 {
			capMb = 512
		}
		if cfg.MaxRAMMB > capMb {
			cfg.MaxRAMMB = capMb
		}
	}

	if cpuCores > 0 && cfg.MaxCPUCores > cpuCores {
		cfg.MaxCPUCores = cpuCores
	}
}
