//go:build windows

package resourceguard

import (
	"syscall"
)

var (
	procGetCurrentProcess      = modKernel32.NewProc("GetCurrentProcess")
	procSetProcessAffinityMask = modKernel32.NewProc("SetProcessAffinityMask")
)

func setCPUAffinity(profile Profile, cpus []int) error {
	if len(cpus) == 0 {
		return nil
	}
	var mask uintptr
	for _, cpu := range cpus {
		if cpu >= 0 && cpu < 64 {
			mask |= 1 << uint(cpu)
		}
	}
	if mask == 0 {
		return nil
	}
	handle, _, _ := procGetCurrentProcess.Call()
	ok, _, err := procSetProcessAffinityMask.Call(handle, mask)
	if ok == 0 {
		return err
	}
	if profile == ProfileEco {
		_ = syscall.Setpriority(syscall.PRIO_PROCESS, 0, 10)
	} else if profile == ProfileBalanced {
		_ = syscall.Setpriority(syscall.PRIO_PROCESS, 0, 5)
	}
	return nil
}

func efficiencyCoreIDs(want int) []int {
	total := want
	if total < 1 {
		total = 1
	}
	cpus := make([]int, total)
	for i := 0; i < total; i++ {
		cpus[i] = i
	}
	return cpus
}
