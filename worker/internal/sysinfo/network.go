package sysinfo

import (
	"net"
	"strings"
)

// meteredInterfaceHints are common names for cellular / hotspot interfaces.
var meteredInterfaceHints = []string{
	"pdp", "wwan", "rmnet", "cellular", "usb", "iphone", "android",
}

// DetectMeteredConnection returns true when the active default route likely
// uses a mobile hotspot or cellular interface.
func DetectMeteredConnection() bool {
	ifaces, err := net.Interfaces()
	if err != nil {
		return false
	}

	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		name := strings.ToLower(iface.Name)
		for _, hint := range meteredInterfaceHints {
			if strings.Contains(name, hint) {
				return true
			}
		}
	}
	return false
}
