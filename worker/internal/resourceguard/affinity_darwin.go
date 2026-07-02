//go:build darwin

package resourceguard

import (
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
)

func setCPUAffinity(profile Profile, cpus []int) error {
	if len(cpus) == 0 {
		return nil
	}
	pid := os.Getpid()
	// macOS has no portable sched_setaffinity; Eco uses background QoS.
	if profile == ProfileEco {
		if err := exec.Command("taskpolicy", "-b", "-p", strconv.Itoa(pid)).Run(); err != nil {
			_ = syscall.Setpriority(syscall.PRIO_PROCESS, 0, 10)
		}
		return nil
	}
	if profile == ProfileBalanced {
		_ = syscall.Setpriority(syscall.PRIO_PROCESS, 0, 5)
	}
	return nil
}

// efficiencyCoreIDs uses Apple Silicon perflevel0 (efficiency cluster) when present.
func efficiencyCoreIDs(want int) []int {
	out, err := exec.Command("sysctl", "-n", "hw.perflevel0.logicalcpu").Output()
	if err != nil {
		return nil
	}
	n, err := strconv.Atoi(strings.TrimSpace(string(out)))
	if err != nil || n <= 0 {
		return nil
	}
	if want > n {
		want = n
	}
	cpus := make([]int, want)
	for i := 0; i < want; i++ {
		cpus[i] = i
	}
	return cpus
}
