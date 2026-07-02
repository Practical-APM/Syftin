package sysinfo

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

// Capabilities describes the host machine for tier and fetch-mode selection.
type Capabilities struct {
	OS              string  `json:"os"`
	Arch            string  `json:"arch"`
	RamGB           float64 `json:"ram_gb"`
	CPUCores        int     `json:"cpu_cores"`
	PlaywrightReady bool    `json:"playwright_ready"`
	HasGPU          bool    `json:"has_gpu"`
	GpuVRAMGB       float64 `json:"gpu_vram_gb"`
	GpuInferenceReady bool  `json:"gpu_inference_ready"`
	RecommendedTier   string  `json:"recommended_tier"`
	NodeType          string  `json:"node_type"`
	FetchMode         string  `json:"fetch_mode"`
	ConnectionMetered bool    `json:"connection_metered"`
}

// Probe inspects the local machine and recommends contributor node settings.
func Probe() Capabilities {
	ramBytes := totalRAMBytes()
	ramGB := float64(ramBytes) / (1024 * 1024 * 1024)
	if ramGB < 0.5 {
		ramGB = 0
	}

	pwReady := playwrightChromiumInstalled()
	gpu := probeGPU()

	tier := recommendTier(ramGB, pwReady, gpu.HasGPU)
	fetchMode := recommendFetchMode(tier, pwReady)

	return Capabilities{
		OS:              runtime.GOOS,
		Arch:            runtime.GOARCH,
		RamGB:           round1(ramGB),
		CPUCores:        runtime.NumCPU(),
		PlaywrightReady: pwReady,
		HasGPU:          gpu.HasGPU,
		GpuVRAMGB:       gpu.VRAMGB,
		GpuInferenceReady: gpu.CanInfer,
		RecommendedTier: tier,
		NodeType:        "edge_fetcher",
		FetchMode:       fetchMode,
		ConnectionMetered: DetectMeteredConnection(),
	}
}

func recommendTier(ramGB float64, playwrightReady, hasGPU bool) string {
	if hasGPU && ramGB >= 16 {
		return "titan"
	}
	if ramGB >= 12 && playwrightReady {
		return "ranger"
	}
	if ramGB >= 8 {
		return "scout"
	}
	return "scout"
}

func recommendFetchMode(tier string, playwrightReady bool) string {
	switch tier {
	case "titan", "ranger":
		if playwrightReady {
			return "auto"
		}
		return "http"
	default:
		return "http"
	}
}

func totalRAMBytes() uint64 {
	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("sysctl", "-n", "hw.memsize").Output()
		if err != nil {
			return 0
		}
		n, err := strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64)
		if err != nil {
			return 0
		}
		return n
	case "linux":
		data, err := os.ReadFile("/proc/meminfo")
		if err != nil {
			return 0
		}
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "MemTotal:") {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					kb, err := strconv.ParseUint(fields[1], 10, 64)
					if err != nil {
						return 0
					}
					return kb * 1024
				}
			}
		}
	}
	return 0
}

func playwrightChromiumInstalled() bool {
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}

	candidates := []string{
		filepath.Join(home, "Library", "Caches", "ms-playwright"),
		filepath.Join(home, ".cache", "ms-playwright"),
	}
	if v := os.Getenv("PLAYWRIGHT_BROWSERS_PATH"); v != "" {
		candidates = append([]string{v}, candidates...)
	}

	for _, root := range candidates {
		matches, err := filepath.Glob(filepath.Join(root, "chromium-*"))
		if err != nil {
			continue
		}
		for _, dir := range matches {
			if info, err := os.Stat(dir); err == nil && info.IsDir() {
				return true
			}
		}
	}
	return false
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}
