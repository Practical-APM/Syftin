package resourceguard

import (
	"math"
	"time"
)

// ThermalController applies PD-based throttling delays between tasks.
type ThermalController struct {
	cfg       Config
	lastTemp  float64
	lastAt    time.Time
	hasSample bool
}

func NewThermalController(cfg Config) *ThermalController {
	return &ThermalController{cfg: cfg}
}

func (t *ThermalController) Update(cfg Config) {
	t.cfg = cfg
}

// TaskDelay returns artificial wait time before the next fetch task.
func (t *ThermalController) TaskDelay() time.Duration {
	temp, ok := CurrentTemperatureC()
	now := time.Now()

	if !ok {
		return time.Duration(t.cfg.MinTaskDelaySec * float64(time.Second))
	}

	if temp >= t.cfg.EmergencyCutoffC {
		return 0
	}

	var derivative float64
	if t.hasSample {
		dt := now.Sub(t.lastAt).Seconds()
		if dt > 0 {
			derivative = (temp - t.lastTemp) / dt
		}
	}
	t.lastTemp = temp
	t.lastAt = now
	t.hasSample = true

	excess := temp - t.cfg.TargetTemperatureC
	if excess < 0 {
		excess = 0
	}

	waitSec := t.cfg.ProportionalGain*excess + t.cfg.DerivativeGain*derivative
	if waitSec < 0 {
		waitSec = 0
	}
	if waitSec < t.cfg.MinTaskDelaySec {
		waitSec = t.cfg.MinTaskDelaySec
	}

	return time.Duration(waitSec * float64(time.Second))
}

func (t *ThermalController) EmergencyActive() bool {
	temp, ok := CurrentTemperatureC()
	if !ok {
		return false
	}
	return temp >= t.cfg.EmergencyCutoffC
}

func (t *ThermalController) Snapshot() (tempC float64, ok bool, delaySec float64) {
	temp, ok = CurrentTemperatureC()
	delay := t.TaskDelay()
	return temp, ok, math.Round(delay.Seconds()*10) / 10
}
