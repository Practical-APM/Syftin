package resourceguard

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

func onACPower() bool {
	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("pmset", "-g", "bat").Output()
		if err != nil {
			return true
		}
		s := string(out)
		return strings.Contains(s, "AC Power") || strings.Contains(s, "Now drawing from 'AC")
	case "linux":
		if matches, _ := filepath.Glob("/sys/class/power_supply/AC*/online"); len(matches) > 0 {
			for _, path := range matches {
				raw, err := os.ReadFile(path)
				if err == nil && strings.TrimSpace(string(raw)) == "1" {
					return true
				}
			}
		}
		if matches, _ := filepath.Glob("/sys/class/power_supply/Mains*/online"); len(matches) > 0 {
			for _, path := range matches {
				raw, err := os.ReadFile(path)
				if err == nil && strings.TrimSpace(string(raw)) == "1" {
					return true
				}
			}
		}
		if matches, _ := filepath.Glob("/sys/class/power_supply/BAT*/status"); len(matches) > 0 {
			for _, path := range matches {
				raw, err := os.ReadFile(path)
				if err == nil && strings.TrimSpace(string(raw)) == "Discharging" {
					return false
				}
			}
		}
	case "windows":
		return onACPowerWindows()
	}
	return true
}

func userIdleDuration() time.Duration {
	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("ioreg", "-c", "IOHIDSystem").Output()
		if err != nil {
			return 0
		}
		for _, line := range strings.Split(string(out), "\n") {
			if strings.Contains(line, "HIDIdleTime") {
				fields := strings.Fields(line)
				for _, f := range fields {
					n, err := strconv.ParseInt(strings.Trim(f, "= "), 10, 64)
					if err == nil && n > 0 {
						return time.Duration(n)
					}
				}
			}
		}
	case "linux":
		if path, err := exec.LookPath("xprintidle"); err == nil {
			out, err := exec.Command(path).Output()
			if err == nil {
				ms, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64)
				if err == nil {
					return time.Duration(ms) * time.Millisecond
				}
			}
		}
	case "windows":
		return userIdleDurationWindows()
	}
	return 0
}

func userIsActive(idleThresholdSec int) bool {
	idle := userIdleDuration()
	if idle == 0 {
		return false
	}
	return idle < time.Duration(idleThresholdSec)*time.Second
}

func processRAMMB() int {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return int(m.Alloc / (1024 * 1024))
}
