//go:build windows

package resourceguard

import (
	"syscall"
	"time"
	"unsafe"
)

var (
	modKernel32                  = syscall.NewLazyDLL("kernel32.dll")
	procGetSystemPowerStatus     = modKernel32.NewProc("GetSystemPowerStatus")
	procGetTickCount             = modKernel32.NewProc("GetTickCount")
	modUser32                    = syscall.NewLazyDLL("user32.dll")
	procGetLastInputInfo         = modUser32.NewProc("GetLastInputInfo")
)

// systemPowerStatus matches Win32 SYSTEM_POWER_STATUS.
type systemPowerStatus struct {
	acLineStatus        byte
	batteryFlag         byte
	batteryLifePercent  byte
	systemStatusFlag    byte
	batteryLifeTime     uint32
	batteryFullLifeTime uint32
}

type lastInputInfo struct {
	cbSize uint32
	dwTime uint32
}

const (
	acLineOffline  = 0
	acLineOnline   = 1
	acLineUnknown  = 255
)

func onACPowerWindows() bool {
	var status systemPowerStatus
	r, _, _ := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&status)))
	if r == 0 {
		return true
	}
	switch status.acLineStatus {
	case acLineOffline:
		return false
	case acLineOnline:
		return true
	default:
		return true
	}
}

func userIdleDurationWindows() time.Duration {
	var lii lastInputInfo
	lii.cbSize = uint32(unsafe.Sizeof(lii))
	ok, _, _ := procGetLastInputInfo.Call(uintptr(unsafe.Pointer(&lii)))
	if ok == 0 {
		return 0
	}
	now, _, _ := procGetTickCount.Call()
	idleMs := uint32(now) - lii.dwTime
	return time.Duration(idleMs) * time.Millisecond
}
