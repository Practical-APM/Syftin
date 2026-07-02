//go:build linux

package resourceguard

import (
	"os"
	"sort"
	"strconv"
	"strings"
	"syscall"
)

func setCPUAffinity(profile Profile, cpus []int) error {
	if len(cpus) == 0 {
		return nil
	}
	var set syscall.CPUSet
	for _, cpu := range cpus {
		if cpu < 0 || cpu >= syscall.CPUSetSize {
			continue
		}
		set.Set(cpu)
	}
	return syscall.SchedSetaffinity(os.Getpid(), &set)
}

func efficiencyCoreIDs(want int) []int {
	type coreFreq struct {
		id  int
		max uint64
	}

	var cores []coreFreq
	for i := 0; i < syscall.CPUSetSize; i++ {
		path := "/sys/devices/system/cpu/cpu" + strconv.Itoa(i) + "/cpufreq/cpuinfo_max_freq"
		raw, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		freq, err := strconv.ParseUint(strings.TrimSpace(string(raw)), 10, 64)
		if err != nil {
			continue
		}
		cores = append(cores, coreFreq{id: i, max: freq})
	}
	if len(cores) == 0 {
		return nil
	}

	sort.Slice(cores, func(i, j int) bool {
		if cores[i].max == cores[j].max {
			return cores[i].id < cores[j].id
		}
		return cores[i].max < cores[j].max
	})

	out := make([]int, 0, want)
	for _, c := range cores {
		out = append(out, c.id)
		if len(out) >= want {
			break
		}
	}
	return out
}
