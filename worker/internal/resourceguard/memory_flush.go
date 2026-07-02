package resourceguard

import (
	"log/slog"
	"runtime"
	"runtime/debug"
	"time"

	"github.com/syftin/worker/internal/sysinfo"
)

// RuntimeResetFunc clears browser or local model sessions after memory pressure.
type RuntimeResetFunc func()

// flushVolatileMemory encourages the runtime and OS to release heap pages.
func flushVolatileMemory() {
	runtime.GC()
	debug.FreeOSMemory()
}

func profileVRAMPercent(profile Profile) float64 {
	switch profile {
	case ProfileEco:
		return 0.25
	case ProfileTitan:
		return 1.0
	default:
		return 0.5
	}
}

func (g *Guard) gpuVRAMLimitGB() float64 {
	if g.gpuVRAMGB <= 0 {
		return 0
	}
	limit := g.gpuVRAMGB * profileVRAMPercent(g.cfg.Profile)
	ramCapGB := float64(g.cfg.MaxRAMMB) / 1024
	if ramCapGB > 0 && ramCapGB < limit {
		limit = ramCapGB
	}
	return limit
}

func (g *Guard) checkVRAMPressure() {
	if !g.hasGPU {
		return
	}
	used, ok := sysinfo.NvidiaVRAMUsedGB()
	if !ok {
		return
	}
	g.vramUsedGB = used
	limit := g.gpuVRAMLimitGB()
	if limit <= 0 {
		return
	}
	if used > limit {
		g.recoverMemory("vram_limit", slog.Float64("used_gb", used), slog.Float64("limit_gb", limit))
	}
}

func (g *Guard) tryRecoverRAM() bool {
	if processRAMMB() <= g.cfg.MaxRAMMB {
		return true
	}
	if time.Since(g.lastMemoryRecover) < 30*time.Second {
		return false
	}
	g.recoverMemory("ram_limit",
		slog.Int("alloc_mb", processRAMMB()),
		slog.Int("limit_mb", g.cfg.MaxRAMMB),
	)
	g.lastMemoryRecover = time.Now()
	return processRAMMB() <= g.cfg.MaxRAMMB
}

func (g *Guard) recoverMemory(reason string, attrs ...any) {
	if g.logger != nil {
		args := append([]any{slog.String("reason", reason)}, attrs...)
		g.logger.Warn("runtime recovery — flushing memory and resetting sessions", args...)
	}
	flushVolatileMemory()
	for _, fn := range g.resetters {
		if fn != nil {
			fn()
		}
	}
}

// RegisterRuntimeReset hooks browser/model teardown (e.g. fetch.RequestRuntimeReset).
func (g *Guard) RegisterRuntimeReset(fn RuntimeResetFunc) {
	g.resetters = append(g.resetters, fn)
}

// RunHealthChecks enforces VRAM/RAM limits from the 2s telemetry loop.
func (g *Guard) RunHealthChecks() {
	g.checkVRAMPressure()
	if processRAMMB() > g.cfg.MaxRAMMB {
		g.tryRecoverRAM()
	}
}
