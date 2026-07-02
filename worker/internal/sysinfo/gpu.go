package sysinfo

const minInferenceVRAMGB = 4.0

// GPUInfo describes discrete GPU memory available for future local inference.
type GPUInfo struct {
	HasGPU  bool    `json:"has_gpu"`
	VRAMGB  float64 `json:"gpu_vram_gb"`
	CanInfer bool   `json:"gpu_inference_ready"`
}

func probeGPU() GPUInfo {
	if vram, ok := nvidiaVRAMGB(); ok {
		return GPUInfo{
			HasGPU:   true,
			VRAMGB:   round1(vram),
			CanInfer: vram >= minInferenceVRAMGB,
		}
	}
	return GPUInfo{}
}

func nvidiaVRAMGB() (float64, bool) {
	return nvidiaQuery("memory.total")
}

// InferenceReady reports whether local GPU inference is allowed for the given VRAM.
func InferenceReady(vramGB float64) bool {
	return vramGB >= minInferenceVRAMGB
}
