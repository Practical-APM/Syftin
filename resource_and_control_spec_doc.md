# Engineering Specification: Resource Autonomy & Reactive Thermal Control Protocol

This document establishes the hardware-level telemetry boundaries, closed-loop PID control logic, and user-facing parameters for the **Syftin Worker Daemon**. The client must operate as an adaptable utility, protecting the contributor's personal computer from heat spikes, battery degradation, and processing lag.

---

## 1. Local Runtime Configuration Interface (`syftin.config.toml`)

The daemon must parse this configuration file upon initialization. Users can adjust these values directly via a text editor or a UI toggle to constrain how Syftin uses their hardware resources.

```toml
[node_identity]
contributor_email = "friend@college.edu"
payout_upi_id = "friendname@okaxis"

[thermal_safeguards]
# Target temperature window in Celsius for optimal operation
target_temperature = 48.0
# Proportional throttling sensitivity scalar (Alpha)
proportional_gain = 0.15
# Derivative thermal acceleration dampener (Beta)
derivative_gain = 0.08
# Hard ceiling: Entering emergency cooldown state if crossed
emergency_cutoff_temp = 55.0
# Cooldown phase lock duration in seconds
emergency_sleep_duration = 300

[user_resource_allocation]
# Operating profile rulesets: "ECO" (25%), "BALANCED" (50%), "TITAN" (User-Approved Maximum)
selected_profile = "BALANCED"
# Absolute ceiling of total CPU cores the daemon is allowed to touch
max_cpu_cores_limit = 4
# Absolute hardware memory boundary in Megabytes
max_ram_mb_limit = 4096
# Toggle allowing the system to use the local GPU/VRAM for edge parsing inference
enable_gpu_inference = true

[system_activity_triggers]
# Automatically pause execution loops when the system runs on battery power
require_ac_power = true
# Instantly halt processing tasks when user movement is captured
pause_on_user_activity = true
# Duration of zero user inputs in seconds required to flag the system as "Idle"
idle_threshold_seconds = 120
# Safety circuit: Instantly pause tasks if a metered network connection is identified
block_metered_networks = true

2. Dynamic Thermal Throttling Logic (PID-Feedback Engine)To maintain system temperatures safely inside the designated $45^\circ\text{C} - 50^\circ\text{C}$ window, the Go/Rust engine must query local hardware thermal interfaces (/sys/class/thermal/ on Linux, sysctl smc variables on macOS) every 2 seconds.The daemon inserts an artificial execution delay ($D_{\text{wait}}$) between web extraction tasks based on the current thermal trajectory:$$D_{\text{wait}} = \max\left(0, \alpha \cdot (T_{\text{current}} - T_{\text{target}}) + \beta \cdot \frac{\Delta T}{\Delta t}\right)$$Proportional-Derivative (PD) Logic Implementation Rules:The Proportional Element ($\alpha$): If the current temperature ($T_{\text{current}}$) rises above the user-defined target_temperature, the script applies an immediate incremental processing delay to slow down network requests.The Derivative Element ($\beta$): The system calculates the rate of thermal acceleration ($\frac{\Delta T}{\Delta t}$). If a user suddenly begins a resource-heavy action (like rendering a file or opening a game), causing the temperature to spike quickly, the derivative brake triggers a protective delay before the system reaches the target temperature.The Emergency Circuit Breaker: If $T_{\text{current}} \ge \text{emergency\_cutoff\_temp}$, the daemon calls an immediate hardware exit function, flushes its volatile memory layers, and enters a dormant SLEEP state for 5 minutes (emergency_sleep_duration).3. Resource Profile Allocation MatricesThe application must read selected_profile and enforce strict system thread boundaries using native kernel bindings (e.g., sched_setaffinity on Linux, Quality of Service pthread thread priorities on macOS):A. ECO Profile (25% Operational Envelope)Limits processing strictly to a maximum of 2 system efficiency cores.Clamps volatile system memory allocations to $\le 25\%$ of total system RAM capacity.Enforces a structural minimum delay baseline ($D_{\text{wait}} \ge 10\text{ seconds}$) between tasks to ensure silent fan operation.B. BALANCED Profile (50% Operational Envelope)Allocates up to 50% of available CPU cores and system RAM limits.Allows local execution of smaller, highly optimized models (like 1.5B or 3B parameter models) only if the GPU has at least 4GB of VRAM.C. TITAN Profile (User-Approved Maximum Core Load)Grants full access to available system resources.Mandatory Constraint: This profile automatically binds to local input event hooks. If mouse movement or keyboard clicks are captured, the daemon pauses its work streams within 100 milliseconds and completely yields execution priority back to the host operating system.4. Hardware Health Verification LoopThe background daemon must continuously run an orchestration checking routine every 2 seconds to ensure compliance with the following infrastructure rules:Power Delivery Guardrail: Check AC charging parameters via system power APIs. If the device is running on battery power (require_ac_power = true), instantly shut down processing loops to protect battery life.Network Metering Sensor: Query local routing states. If a network configuration returns flags indicating a cellular link or mobile hotspot connection, freeze data streams instantly to avoid consuming mobile data allowances.Memory Leak Isolation: Local model runtimes can occasionally leave behind cached memory artifacts. If memory footprints cross the user's defined max_ram_mb_limit, the background worker must instantly trigger a clean restart of the local model runner process to reclaim VRAM.


User-Decided Resource Sharing ProfilesContributors must have absolute autonomy over their hardware. The client interface will expose three distinct slider caps or profiles that map directly to runtime resource boundaries:+-----------------------------------------------------------------------+
|                       SYFTIN USER CONTROL PANEL                       |
+-----------------------------------------------------------------------+
|  [ ] Eco Mode (25%)    [X] Balanced (50%)    [ ] Titan Mode (100%)    |
|                                                                       |
|  CPU Core Limit:   [=======|-------] 4 / 8 Cores Allocated            |
|  Max Memory Cap:   [=============|-] 6GB / 8GB RAM Allocated          |
|  Network Behavior: [X] Run only when system is completely idle         |
+-----------------------------------------------------------------------+
Resource Boundary ConfigurationsEco Profile (25% Cap): * Pins the daemon strictly to 1 or 2 efficiency CPU cores (using OS-level affinity features like Linux taskset or macOS QoS threads).Limits system memory usage to $\le 25\%$ of total system RAM.Forces a minimum 10-second delay between tasks to keep the cooling fan silent.Balanced Profile (50% Cap): * Allocates up to 50% of available CPU cores and system RAM.Enables local execution of smaller, highly optimized models (like 1.5B or 3B parameter models) only if the GPU has at least 4GB of VRAM.Maximum Profile (User-Approved 100% Core Load):Unlocks full hardware capabilities. This profile automatically pauses execution the second user activity is detected (mouse movement, keyboard inputs) so it never interrupts gaming or coding sessions.📊 3. System Health Monitor & Resource UtilizerThe Go daemon must incorporate a lightweight telemetry loop that monitors system health without consuming significant processing power itself (using efficient libraries like gopsutil on Linux/Windows and native sysctl bindings on macOS).Key System Health Metrics Tracked Every 2 Seconds:Battery Status Check: If the laptop is unplugged and running on battery power, the client instantly shuts down to prevent battery drain. It requires active AC power to run.User Idle Telemetry: Monitors system input event hooks. If a user moves their mouse, the daemon sets an internal flag (user_active = true) and yields CPU priority back to the operating system within 100 milliseconds.VRAM Leak Protection: Local model inference can occasionally leave artifacts in your graphics memory. The monitor tracks VRAM footprints. If usage crosses the user's allocated limit due to model context expansion, it flushes the local runner memory pool completely.🖥️ 4. Interactive Pre-Launch Calculator (For Your Landing Page)To onboard your 100-120 friends and future campus contributors smoothly, your landing page needs a tool that lets them see exactly how much they can earn based on their hardware specs, without needing to download anything first.Here is a fully functional, highly interactive HTML, Tailwind CSS, and JavaScript Component you can drop right into your Next.js project or landing page. It features realistic Indian Rupee (INR) income estimations based on your multi-tiered hardware matrix.HTML<div class="max-w-xl mx-auto bg-slate-900 border border-teal-500/30 text-white rounded-xl p-6 shadow-2xl font-sans">
  <div class="text-center mb-6">
    <h3 class="text-xl font-bold text-teal-400 uppercase tracking-wider">Syftin Node Capacity Estimator</h3>
    <p class="text-xs text-slate-400 mt-1">Calculate your side-hustle potential based on your laptop specs</p>
  </div>

  <div class="space-y-4">
    <div>
      <label class="block text-xs font-semibold text-slate-300 uppercase mb-2">Operating System</label>
      <select id="calc-os" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-teal-300 focus:outline-none focus:border-teal-500">
        <option value="macos-m">macOS (Apple Silicon M1/M2/M3)</option>
        <option value="linux-nv">Linux / Windows (NVIDIA Dedicated GPU)</option>
        <option value="intel-amd">Any OS (Integrated Intel/AMD Graphics Only)</option>
      </select>
    </div>

    <div>
      <label class="block text-xs font-semibold text-slate-300 uppercase mb-2">System RAM Capacity</label>
      <select id="calc-ram" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-teal-300 focus:outline-none focus:border-teal-500">
        <option value="8">8 GB RAM</option>
        <option value="16" selected>16 GB RAM</option>
        <option value="32">32 GB or Higher</option>
      </select>
    </div>

    <div>
      <label class="block text-xs font-semibold text-slate-300 uppercase mb-2">Estimated Uptime (Hours per Day)</label>
      <div class="flex items-center gap-4">
        <input id="calc-hours" type="range" min="2" max="24" value="8" class="w-full accent-teal-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
        <span id="hours-display" class="text-sm font-bold bg-slate-800 border border-slate-700 px-3 py-1 rounded text-teal-400 min-w-[60px] text-center">8 Hrs</span>
      </div>
    </div>
  </div>

  <hr class="border-slate-800 my-6">

  <div class="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
    <div class="flex justify-between items-center">
      <span class="text-xs font-medium text-slate-400">Assigned Worker Classification:</span>
      <span id="res-tier" class="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">Analyzing...</span>
    </div>
    <div class="flex justify-between items-center">
      <span class="text-xs font-medium text-slate-400">Primary Task Assignment:</span>
      <span id="res-task" class="text-xs font-semibold text-slate-200">Processing Pipeline</span>
    </div>
    
    <div class="pt-2 border-t border-slate-900 flex justify-between items-end">
      <div>
        <span class="block text-xs font-bold uppercase tracking-wider text-teal-500">Estimated Monthly Income</span>
        <span class="text-xxs text-slate-500">Paid out seamlessly via automated UPI rails</span>
      </div>
      <div class="text-right">
        <span id="res-payout" class="text-2xl font-black text-teal-400 tracking-tight">₹0</span>
        <span class="text-xs text-slate-400 block">/ month</span>
      </div>
    </div>
  </div>
</div>

<script>
  function runSyftinCalculator() {
    const os = document.getElementById('calc-os').value;
    const ram = parseInt(document.getElementById('calc-ram').value);
    const hours = parseInt(document.getElementById('calc-hours').value);
    
    document.getElementById('hours-display').innerText = hours + " Hrs";
    
    let tier = "Tier 1: Scout";
    let task = "Pure HTTP Ingestion & Residential Proxy Routing";
    let baseRatePerHour = 4.50; // INR baseline payout computation value
    
    if (os === "macos-m" && ram >= 16) {
      tier = "Tier 3: Titan";
      task = "Deep Structural Complex Multi-Step Agent Parsing (7B+)";
      baseRatePerHour = 18.75;
    } else if (os === "macos-m" && ram === 8) {
      tier = "Tier 2: Ranger";
      task = "HTML Document Extraction & 3B Quantized LLM Schema Refining";
      baseRatePerHour = 9.20;
    } else if (os === "linux-nv" && ram >= 16) {
      tier = "Tier 3: Titan";
      task = "Deep Structural Complex Multi-Step Agent Parsing (7B+)";
      baseRatePerHour = 22.50; // Discrete NVIDIA VRAM captures higher margin
    } else if (os === "linux-nv" && ram === 8) {
      tier = "Tier 2: Ranger";
      task = "HTML Document Extraction & 3B Quantized LLM Schema Refining";
      baseRatePerHour = 11.00;
    } else {
      tier = "Tier 1: Scout";
      task = "Pure HTTP Ingestion & Residential Proxy Routing";
      baseRatePerHour = 4.25;
    }
    
    const monthlyEarnings = Math.round(baseRatePerHour * hours * 30);
    
    document.getElementById('res-tier').innerText = tier;
    document.getElementById('res-task').innerText = task;
    document.getElementById('res-payout').innerText = "~ ₹" + monthlyEarnings.toLocaleString('en-IN');
  }

  // Bind operational change hooks
  document.getElementById('calc-os').addEventListener('change', runSyftinCalculator);
  document.getElementById('calc-ram').addEventListener('change', runSyftinCalculator);
  document.getElementById('calc-hours').addEventListener('input', runSyftinCalculator);

  // Initial runtime execution load
  runSyftinCalculator();
</script>
What's Next?This calculator gives your pilot contributors a clear, tangible view of their earning potential. 