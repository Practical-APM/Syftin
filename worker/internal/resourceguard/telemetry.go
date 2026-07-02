package resourceguard

import "time"

// Telemetry is reported to Syftin on each 2s health loop.
type Telemetry struct {
	Profile           string  `json:"profile"`
	TempC             float64 `json:"temp_c,omitempty"`
	TempAvailable     bool    `json:"temp_available"`
	WorkAllowed       bool    `json:"work_allowed"`
	PauseReason       string  `json:"pause_reason,omitempty"`
	TaskDelaySec      float64 `json:"task_delay_sec"`
	RamUsedMb         int     `json:"ram_used_mb"`
	RamLimitMb        int     `json:"ram_limit_mb"`
	OnAcPower         bool    `json:"on_ac_power"`
	ConnectionMetered bool    `json:"connection_metered"`
	GpuInferenceOn    bool    `json:"gpu_inference_on"`
	GpuVramUsedGb     float64 `json:"gpu_vram_used_gb,omitempty"`
	GpuVramLimitGb    float64 `json:"gpu_vram_limit_gb,omitempty"`
	ReportedAt        string  `json:"reported_at"`
}

func (g *Guard) Telemetry(metered bool) Telemetry {
	temp, tempOK, delaySec := g.thermal.Snapshot()
	allowed, reason := g.AllowWork(metered)
	t := Telemetry{
		Profile:           string(g.cfg.Profile),
		TempAvailable:     tempOK,
		WorkAllowed:       allowed,
		TaskDelaySec:      delaySec,
		RamUsedMb:         processRAMMB(),
		RamLimitMb:        g.cfg.MaxRAMMB,
		OnAcPower:         onACPower(),
		ConnectionMetered: metered,
		GpuInferenceOn:    GPUInferenceAllowed(g.hasGPU, g.gpuVRAMGB, g.cfg.EnableGPUInference),
		GpuVramUsedGb:     g.vramUsedGB,
		GpuVramLimitGb:    g.gpuVRAMLimitGB(),
		ReportedAt:        time.Now().UTC().Format(time.RFC3339),
	}
	if tempOK {
		t.TempC = temp
	}
	if reason != PauseNone {
		t.PauseReason = string(reason)
	}
	return t
}
