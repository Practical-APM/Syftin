package fetch

import "sync/atomic"

var runtimeResetRequested atomic.Bool

// RequestRuntimeReset signals the next browser/model session to start clean.
func RequestRuntimeReset() {
	runtimeResetRequested.Store(true)
}

func consumeRuntimeReset() bool {
	return runtimeResetRequested.Swap(false)
}
