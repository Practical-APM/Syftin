package resourceguard

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

type Profile string

const (
	ProfileEco      Profile = "eco"
	ProfileBalanced Profile = "balanced"
	ProfileTitan    Profile = "titan"
)

// Config mirrors syftin.config.toml and contributor portal settings.
type Config struct {
	Profile              Profile `json:"profile"`
	MaxCPUCores          int     `json:"max_cpu_cores"`
	MaxRAMMB             int     `json:"max_ram_mb"`
	TargetTemperatureC   float64 `json:"target_temperature_c"`
	EmergencyCutoffC     float64 `json:"emergency_cutoff_c"`
	EmergencySleepSec    int     `json:"emergency_sleep_sec"`
	ProportionalGain     float64 `json:"proportional_gain"`
	DerivativeGain       float64 `json:"derivative_gain"`
	RequireACPower       bool    `json:"require_ac_power"`
	PauseOnUserActivity  bool    `json:"pause_on_user_activity"`
	IdleThresholdSec     int     `json:"idle_threshold_sec"`
	BlockMeteredNetworks bool    `json:"block_metered_networks"`
	EnableGPUInference   bool    `json:"enable_gpu_inference"`
	MinTaskDelaySec      float64 `json:"min_task_delay_sec"`
}

func DefaultConfig() Config {
	cores := runtime.NumCPU()
	if cores > 4 {
		cores = 4
	}
	return Config{
		Profile:              ProfileBalanced,
		MaxCPUCores:          cores,
		MaxRAMMB:             4096,
		TargetTemperatureC:   48,
		EmergencyCutoffC:     55,
		EmergencySleepSec:    300,
		ProportionalGain:     0.15,
		DerivativeGain:       0.08,
		RequireACPower:       true,
		PauseOnUserActivity:  true,
		IdleThresholdSec:     120,
		BlockMeteredNetworks: true,
		EnableGPUInference:   false,
		MinTaskDelaySec:      2,
	}
}

func ConfigDir() string {
	if v := os.Getenv("SYFTIN_INSTALL_DIR"); v != "" {
		return v
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	return filepath.Join(home, ".syftin", "node")
}

func TomlPath() string {
	return filepath.Join(ConfigDir(), "syftin.config.toml")
}

func JSONPath() string {
	return filepath.Join(ConfigDir(), "resource.json")
}

// Load reads resource.json, then syftin.config.toml, then defaults.
func Load() Config {
	cfg := DefaultConfig()

	if raw, err := os.ReadFile(JSONPath()); err == nil {
		_ = json.Unmarshal(raw, &cfg)
	} else if raw, err := os.ReadFile(TomlPath()); err == nil {
		applyToml(string(raw), &cfg)
	}

	applyProfileRules(&cfg)
	applyRuntimeLimits(cfg, nil)
	return cfg
}

// SaveJSON persists settings from the Syftin API for offline use.
func SaveJSON(cfg Config) error {
	if err := os.MkdirAll(ConfigDir(), 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(JSONPath(), raw, 0o600)
}

// ApplyRemote merges API-provided settings (camelCase from web).
func ApplyRemote(cfg *Config, remote map[string]any) {
	if remote == nil {
		return
	}
	if v, ok := remote["profile"].(string); ok {
		cfg.Profile = Profile(strings.ToLower(v))
	}
	if v, ok := asInt(remote["maxCpuCores"]); ok {
		cfg.MaxCPUCores = v
	}
	if v, ok := asInt(remote["maxRamMb"]); ok {
		cfg.MaxRAMMB = v
	}
	if v, ok := asFloat(remote["targetTemperatureC"]); ok {
		cfg.TargetTemperatureC = v
	}
	if v, ok := asFloat(remote["emergencyCutoffC"]); ok {
		cfg.EmergencyCutoffC = v
	}
	if v, ok := asInt(remote["emergencySleepSec"]); ok {
		cfg.EmergencySleepSec = v
	}
	if v, ok := asFloat(remote["proportionalGain"]); ok {
		cfg.ProportionalGain = v
	}
	if v, ok := asFloat(remote["derivativeGain"]); ok {
		cfg.DerivativeGain = v
	}
	if v, ok := remote["requireAcPower"].(bool); ok {
		cfg.RequireACPower = v
	}
	if v, ok := remote["pauseOnUserActivity"].(bool); ok {
		cfg.PauseOnUserActivity = v
	}
	if v, ok := asInt(remote["idleThresholdSec"]); ok {
		cfg.IdleThresholdSec = v
	}
	if v, ok := remote["blockMeteredNetworks"].(bool); ok {
		cfg.BlockMeteredNetworks = v
	}
	if v, ok := remote["enableGpuInference"].(bool); ok {
		cfg.EnableGPUInference = v
	}
	applyProfileRules(cfg)
	applyRuntimeLimits(*cfg, nil)
}

func applyProfileRules(cfg *Config) {
	switch cfg.Profile {
	case ProfileEco:
		cfg.MinTaskDelaySec = 10
		cfg.PauseOnUserActivity = true
		cap := runtime.NumCPU() / 4
		if cap < 1 {
			cap = 1
		}
		if cap > 2 {
			cap = 2
		}
		if cfg.MaxCPUCores > cap {
			cfg.MaxCPUCores = cap
		}
	case ProfileTitan:
		cfg.MinTaskDelaySec = 0
		cfg.PauseOnUserActivity = true
	case ProfileBalanced:
		if cfg.MinTaskDelaySec < 2 {
			cfg.MinTaskDelaySec = 2
		}
	}
}

func applyToml(content string, cfg *Config) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "[") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.Trim(strings.TrimSpace(parts[1]), `"`)
		switch key {
		case "selected_profile":
			cfg.Profile = Profile(strings.ToLower(val))
		case "max_cpu_cores_limit":
			if n, err := strconv.Atoi(val); err == nil {
				cfg.MaxCPUCores = n
			}
		case "max_ram_mb_limit":
			if n, err := strconv.Atoi(val); err == nil {
				cfg.MaxRAMMB = n
			}
		case "target_temperature":
			if f, err := strconv.ParseFloat(val, 64); err == nil {
				cfg.TargetTemperatureC = f
			}
		case "emergency_cutoff_temp":
			if f, err := strconv.ParseFloat(val, 64); err == nil {
				cfg.EmergencyCutoffC = f
			}
		case "emergency_sleep_duration":
			if n, err := strconv.Atoi(val); err == nil {
				cfg.EmergencySleepSec = n
			}
		case "proportional_gain":
			if f, err := strconv.ParseFloat(val, 64); err == nil {
				cfg.ProportionalGain = f
			}
		case "derivative_gain":
			if f, err := strconv.ParseFloat(val, 64); err == nil {
				cfg.DerivativeGain = f
			}
		case "require_ac_power":
			cfg.RequireACPower = val == "true"
		case "pause_on_user_activity":
			cfg.PauseOnUserActivity = val == "true"
		case "idle_threshold_seconds":
			if n, err := strconv.Atoi(val); err == nil {
				cfg.IdleThresholdSec = n
			}
		case "block_metered_networks":
			cfg.BlockMeteredNetworks = val == "true"
		case "enable_gpu_inference":
			cfg.EnableGPUInference = val == "true"
		}
	}
}

func asInt(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	default:
		return 0, false
	}
}

func asFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}
