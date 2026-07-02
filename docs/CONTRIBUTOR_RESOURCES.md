# Contributor resource autonomy

How Persona B controls CPU, memory, thermal, and activity safeguards on their laptop.

---

## Control panel

**Contributor → Resources** (`/contributor/resources`)

| Profile | CPU / RAM cap | Behavior |
|---------|---------------|----------|
| **Eco** | 25% | ≤2 cores, 10s min delay between tasks, quiet fans |
| **Balanced** | 50% | Recommended default |
| **Titan** | 100% | Max throughput; **50ms input watch** — pauses within 100ms of mouse/keyboard |

Additional toggles:

- Require AC power (pause on battery)
- Pause when using the machine
- Block metered / mobile hotspot connections

Settings save to Supabase and sync to the node on the next register heartbeat (~every poll cycle).

---

## Local config file

The node daemon also reads `~/.syftin/node/syftin.config.toml` (or `resource.json` from API sync).

Copy generated TOML from the Resources page, or edit manually:

```toml
[user_resource_allocation]
selected_profile = "BALANCED"
max_cpu_cores_limit = 4
max_ram_mb_limit = 4096

[thermal_safeguards]
target_temperature = 48.0
emergency_cutoff_temp = 55.0
```

---

## Worker implementation

Package: `worker/internal/resourceguard/`

| Component | Role |
|-----------|------|
| `thermal.go` | PD delay between tasks: `α·(T−T_target) + β·ΔT/Δt` |
| `system.go` | AC power, user idle, process RAM (macOS / Linux) |
| `system_windows.go` | `GetSystemPowerStatus` + `GetLastInputInfo` — no PowerShell on hot path |
| `guard.go` | `AllowWork()`, `WaitBeforeTask()`, 2s status logs |
| `config.go` | Profile rules, TOML/JSON load, API merge |
| `affinity_linux.go` | `sched_setaffinity` — Eco pins to lowest-frequency cores |
| `affinity_darwin.go` | Background QoS (`taskpolicy -b`) on Eco; E-core count via sysctl |
| `gpu.go` / `sysinfo/gpu.go` | NVIDIA VRAM probe via `nvidia-smi`; ≥4GB required for `enable_gpu_inference` |
| `activity_watch.go` | 50ms Titan input poll; pauses within 100ms of mouse/keyboard; cancels in-flight fetches |
| `memory_flush.go` | VRAM/RAM pressure recovery; emergency volatile memory flush |
| `affinity_windows.go` | `SetProcessAffinityMask` + lower priority on Eco |

The edge node (`cmd/node`) runs a **2-second telemetry loop** and applies guards before claiming fetch tasks.

### Platform support

| OS | AC power | User idle | Titan ~100ms pause |
|----|----------|-----------|-------------------|
| macOS | `pmset` | `ioreg` HIDIdleTime | ✅ |
| Linux | `/sys/class/power_supply` | `xprintidle` (if installed) | ✅ |
| Windows | `GetSystemPowerStatus` | `user32.GetLastInputInfo` | ✅ |

On Windows, battery and idle use native Win32 APIs (not PowerShell), so Titan's 50ms poll stays lightweight.

---

## Database

Migration `20260701000019_contributor_resource_settings.sql`:

```sql
ALTER TABLE contributors ADD COLUMN resource_settings JSONB NOT NULL DEFAULT '...';
```

---

## Capacity estimator

`/contributor/download` includes a pilot earnings estimator (not on the public landing page — persona boundary). Uses `estimateNodeCapacity()` from hardware OS + RAM + uptime inputs.

---

## Roadmap (one-by-one)

| # | Feature | Status |
|---|---------|--------|
| 1 | CPU affinity (`sched_setaffinity` / macOS QoS) | ✅ |
| 2 | GPU VRAM probe + inference gating | ✅ |
| 3 | Sub-100ms input hooks (Titan mode) | ✅ |
| 4 | Windows battery / idle detection | ✅ |
| 5 | Live telemetry in Resources UI | ✅ |
| 6 | Edge GPU inference (local Ollama) | ✅ |

## Spec extras

| Extra | Implementation |
|-------|----------------|
| Emergency memory flush | `recoverMemory()` on thermal emergency — `runtime.GC`, `FreeOSMemory`, session reset |
| VRAM leak protection | `nvidia-smi memory.used` vs profile % cap → resets Playwright / local Ollama sessions |
| RAM leak recovery | Over `max_ram_mb` → flush + reset (30s cooldown between attempts) |
| Profile RAM caps from hardware | `ApplySystemProfileCaps` — Eco 25%, Balanced 50%, Titan 100% of system RAM |
| Windows CPU affinity | `SetProcessAffinityMask` in `affinity_windows.go` |

## Edge GPU inference

When **Enable GPU inference** is on and the node has ≥4GB NVIDIA VRAM:

1. Edge node fetches HTML (HTTP or Playwright)
2. Local **Ollama** runs schema extraction (`OLLAMA_MODEL`, default `qwen2.5:3b-instruct-q4_K_M`)
3. Parsed JSON is uploaded with the fetch task (`fetch_tasks.edge_inference`)
4. Hub worker validates and completes the job without central Ollama

```bash
ollama pull qwen2.5:3b-instruct-q4_K_M
```

Optional node env: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`. Migration `20260701000026_edge_gpu_inference.sql`.

---

*See also: [CONTRIBUTOR_PORTAL.md](./CONTRIBUTOR_PORTAL.md), [resource_and_control_spec_doc.md](../resource_and_control_spec_doc.md)*
