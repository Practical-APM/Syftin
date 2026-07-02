package sysinfo

import (
	"os/exec"
	"strconv"
	"strings"
)

func nvidiaQuery(field string) (float64, bool) {
	path, err := exec.LookPath("nvidia-smi")
	if err != nil {
		return 0, false
	}
	out, err := exec.Command(
		path,
		"--query-gpu="+field,
		"--format=csv,noheader,nounits",
	).Output()
	if err != nil {
		return 0, false
	}
	line := strings.TrimSpace(strings.Split(string(out), "\n")[0])
	mib, err := strconv.ParseFloat(line, 64)
	if err != nil || mib < 0 {
		return 0, false
	}
	return mib / 1024, true
}

// NvidiaVRAMUsedGB returns current GPU memory use (GiB) when nvidia-smi is available.
func NvidiaVRAMUsedGB() (float64, bool) {
	return nvidiaQuery("memory.used")
}
