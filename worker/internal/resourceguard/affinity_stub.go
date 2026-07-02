//go:build !linux && !darwin && !windows

package resourceguard

func setCPUAffinity(profile Profile, cpus []int) error {
	_ = profile
	_ = cpus
	return nil
}

func efficiencyCoreIDs(want int) []int {
	_ = want
	return nil
}
