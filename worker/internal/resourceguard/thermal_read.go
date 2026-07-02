package resourceguard

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

// CurrentTemperatureC returns the hottest thermal zone in Celsius when available.
func CurrentTemperatureC() (float64, bool) {
	switch runtime.GOOS {
	case "linux":
		return linuxTemperatureC()
	case "darwin":
		return darwinTemperatureC()
	default:
		return 0, false
	}
}

func linuxTemperatureC() (float64, bool) {
	matches, err := filepath.Glob("/sys/class/thermal/thermal_zone*/temp")
	if err != nil || len(matches) == 0 {
		return 0, false
	}

	var maxMilli int64
	for _, path := range matches {
		raw, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		milli, err := strconv.ParseInt(strings.TrimSpace(string(raw)), 10, 64)
		if err != nil || milli <= 0 {
			continue
		}
		if milli > maxMilli {
			maxMilli = milli
		}
	}
	if maxMilli == 0 {
		return 0, false
	}
	return float64(maxMilli) / 1000, true
}

func darwinTemperatureC() (float64, bool) {
	// Apple SMC thermal level (0–100); map to a conservative Celsius estimate.
	out, err := exec.Command("sysctl", "-n", "machdep.xcpm.cpu_thermal_level").Output()
	if err == nil {
		level, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
		if err == nil && level > 0 {
			return 35 + (level * 0.25), true
		}
	}

	// Fallback: powermetrics-free estimate from CPU load proxy.
	load, ok := darwinCPULoadProxy()
	if !ok {
		return 42, false
	}
	return 38 + load*22, true
}

func darwinCPULoadProxy() (float64, bool) {
	out, err := exec.Command("sysctl", "-n", "vm.loadavg").Output()
	if err != nil {
		return 0, false
	}
	fields := strings.Fields(string(out))
	if len(fields) < 2 {
		return 0, false
	}
	load, err := strconv.ParseFloat(strings.Trim(fields[1], "{}"), 64)
	if err != nil {
		return 0, false
	}
	cores := float64(runtime.NumCPU())
	if cores < 1 {
		cores = 1
	}
	ratio := load / cores
	if ratio > 1 {
		ratio = 1
	}
	return ratio, true
}
