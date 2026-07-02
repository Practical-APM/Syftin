-- Contributor resource autonomy settings (thermal, CPU/RAM caps, idle/AC guards)

ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS resource_settings JSONB NOT NULL DEFAULT '{
    "profile": "balanced",
    "maxCpuCores": 4,
    "maxRamMb": 4096,
    "targetTemperatureC": 48,
    "emergencyCutoffC": 55,
    "emergencySleepSec": 300,
    "proportionalGain": 0.15,
    "derivativeGain": 0.08,
    "requireAcPower": true,
    "pauseOnUserActivity": true,
    "idleThresholdSec": 120,
    "blockMeteredNetworks": true,
    "enableGpuInference": false
  }'::jsonb;
