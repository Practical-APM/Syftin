package resourceguard

import (
	"context"
	"log/slog"
	"time"

	"github.com/syftin/worker/internal/sysinfo"
)

// PauseReason explains why work was skipped.
type PauseReason string

const (
	PauseNone           PauseReason = ""
	PauseBattery        PauseReason = "on_battery"
	PauseUserActive     PauseReason = "user_active"
	PauseMeteredNetwork PauseReason = "metered_network"
	PauseEmergency      PauseReason = "thermal_emergency"
	PauseRAMLimit       PauseReason = "ram_limit"
	PauseVRAMLimit      PauseReason = "vram_limit"
)

// Guard orchestrates thermal, power, idle, and network safeguards.
type Guard struct {
	cfg     Config
	thermal *ThermalController
	logger  *slog.Logger

	emergencyUntil time.Time
	lastReason     PauseReason

	hasGPU    bool
	gpuVRAMGB float64
	vramUsedGB float64

	systemRamGB   float64
	systemCpuCores int

	lastMemoryRecover time.Time
	resetters         []RuntimeResetFunc

	activity *ActivityWatcher
}

func NewGuard(logger *slog.Logger) *Guard {
	cfg := Load()
	activity := NewActivityWatcher(logger)
	activity.ApplyConfig(cfg)
	activity.Start()
	g := &Guard{
		cfg:      cfg,
		thermal:  NewThermalController(cfg),
		logger:   logger,
		activity: activity,
	}
	applyRuntimeLimits(cfg, logger)
	return g
}

// Stop shuts down background watchers.
func (g *Guard) Stop() {
	if g.activity != nil {
		g.activity.Stop()
	}
}

// WorkContext cancels in-flight work when Titan detects user input.
func (g *Guard) WorkContext(parent context.Context) (context.Context, context.CancelFunc) {
	if g.activity == nil {
		return parent, func() {}
	}
	return g.activity.WorkContext(parent, g.cfg)
}

func (g *Guard) Update(cfg Config) {
	if g.systemRamGB > 0 {
		ApplySystemProfileCaps(&cfg, g.systemRamGB, g.systemCpuCores)
	} else {
		applyProfileRules(&cfg)
	}
	ReconcileGPUInference(&cfg, g.hasGPU, g.gpuVRAMGB)
	g.cfg = cfg
	g.thermal.Update(cfg)
	if g.activity != nil {
		g.activity.ApplyConfig(cfg)
	}
	applyRuntimeLimits(cfg, g.logger)
	_ = SaveJSON(cfg)
}

// SetSystemContext records hardware probes and reclamps profile caps.
func (g *Guard) SetSystemContext(hasGPU bool, vramGB, ramGB float64, cpuCores int) {
	g.hasGPU = hasGPU
	g.gpuVRAMGB = vramGB
	g.systemRamGB = ramGB
	g.systemCpuCores = cpuCores

	cfg := g.cfg
	ApplySystemProfileCaps(&cfg, ramGB, cpuCores)

	wantInference := cfg.EnableGPUInference
	if GPUInferenceAllowed(hasGPU, vramGB, wantInference) {
		if g.logger != nil {
			g.logger.Info("gpu inference enabled", slog.Float64("vram_gb", vramGB))
		}
	} else if wantInference {
		ReconcileGPUInference(&cfg, hasGPU, vramGB)
		if g.logger != nil {
			g.logger.Info(
				"gpu inference disabled — need NVIDIA GPU with ≥4GB VRAM",
				slog.Bool("has_gpu", hasGPU),
				slog.Float64("vram_gb", vramGB),
			)
		}
	}
	g.cfg = cfg
}

// SetHardwareCaps is an alias for SetSystemContext without RAM/CPU context.
func (g *Guard) SetHardwareCaps(hasGPU bool, vramGB float64) {
	g.SetSystemContext(hasGPU, vramGB, g.systemRamGB, g.systemCpuCores)
}

func (g *Guard) Config() Config {
	return g.cfg
}

// AllowWork returns false when the node must not claim or run tasks.
func (g *Guard) AllowWork(metered bool) (bool, PauseReason) {
	g.RunHealthChecks()

	if time.Now().Before(g.emergencyUntil) {
		return false, PauseEmergency
	}

	if g.thermal.EmergencyActive() {
		g.enterEmergency("temperature at emergency cutoff")
		return false, PauseEmergency
	}

	if g.cfg.RequireACPower && !onACPower() {
		return false, PauseBattery
	}

	if g.cfg.BlockMeteredNetworks && metered {
		return false, PauseMeteredNetwork
	}

	if g.cfg.PauseOnUserActivity {
		if g.activity != nil && g.activity.UserActive() {
			return false, PauseUserActive
		}
		if g.activity == nil && userIsActive(g.cfg.IdleThresholdSec) {
			return false, PauseUserActive
		}
	}

	if processRAMMB() > g.cfg.MaxRAMMB {
		if !g.tryRecoverRAM() {
			if g.logger != nil {
				g.logger.Warn(
					"memory cap exceeded",
					slog.Int("alloc_mb", processRAMMB()),
					slog.Int("limit_mb", g.cfg.MaxRAMMB),
				)
			}
			return false, PauseRAMLimit
		}
	}

	if g.hasGPU && g.gpuVRAMGB > 0 {
		limit := g.gpuVRAMLimitGB()
		if limit > 0 && g.vramUsedGB > limit {
			return false, PauseVRAMLimit
		}
	}

	return true, PauseNone
}

func (g *Guard) enterEmergency(detail string) {
	g.recoverMemory("thermal_emergency", slog.String("detail", detail))
	duration := time.Duration(g.cfg.EmergencySleepSec) * time.Second
	g.emergencyUntil = time.Now().Add(duration)
	if g.logger != nil {
		g.logger.Error(
			"thermal emergency cooldown",
			slog.String("detail", detail),
			slog.Duration("sleep", duration),
		)
	}
}

// WaitBeforeTask applies PD thermal delay and profile minimum spacing.
func (g *Guard) WaitBeforeTask(ctx context.Context) {
	delay := g.thermal.TaskDelay()
	if delay <= 0 {
		return
	}

	if g.thermal.EmergencyActive() {
		g.enterEmergency("pre-task temperature check")
	}

	g.logger.Info(
		"thermal throttle delay",
		slog.Duration("wait", delay),
		slog.String("profile", string(g.cfg.Profile)),
	)

	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}

func (g *Guard) LogStatus(metered bool) {
	temp, ok, delaySec := g.thermal.Snapshot()
	allowed, reason := g.AllowWork(metered)
	attrs := []any{
		slog.String("profile", string(g.cfg.Profile)),
		slog.Int("cpu_cores", g.cfg.MaxCPUCores),
		slog.Int("ram_limit_mb", g.cfg.MaxRAMMB),
		slog.Float64("task_delay_sec", delaySec),
		slog.Bool("work_allowed", allowed),
		slog.Bool("metered", metered),
	}
	if ok {
		attrs = append(attrs, slog.Float64("temp_c", temp))
	}
	if reason != PauseNone {
		attrs = append(attrs, slog.String("pause_reason", string(reason)))
	}
	g.logger.Info("resource guard status", attrs...)
}

// MeteredFromCaps wraps sysinfo metered detection for tests.
func MeteredFromCaps(caps sysinfo.Capabilities) bool {
	return caps.ConnectionMetered
}
