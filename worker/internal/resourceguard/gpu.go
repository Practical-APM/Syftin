package resourceguard

const minGPUInferenceVRAMGB = 4.0

// GPUInferenceAllowed returns true when local GPU inference may run.
func GPUInferenceAllowed(hasGPU bool, vramGB float64, enabled bool) bool {
	if !enabled {
		return false
	}
	return hasGPU && vramGB >= minGPUInferenceVRAMGB
}

// ReconcileGPUInference clears enable_gpu_inference when hardware is insufficient.
func ReconcileGPUInference(cfg *Config, hasGPU bool, vramGB float64) bool {
	if !cfg.EnableGPUInference {
		return false
	}
	if GPUInferenceAllowed(hasGPU, vramGB, true) {
		return true
	}
	cfg.EnableGPUInference = false
	return false
}
