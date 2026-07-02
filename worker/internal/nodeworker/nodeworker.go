package nodeworker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/syftin/worker/internal/config"
	"github.com/syftin/worker/internal/extract"
	"github.com/syftin/worker/internal/fetch"
	"github.com/syftin/worker/internal/llm"
	"github.com/syftin/worker/internal/nodeapi"
	"github.com/syftin/worker/internal/resourceguard"
	"github.com/syftin/worker/internal/sysinfo"
)

type FetchTask struct {
	ID            string
	JobID         string
	TargetURL     string
	Domain        string
	ExampleSchema json.RawMessage
}

type Node struct {
	api         *nodeapi.Client
	fetch       *fetch.Client
	guard       *resourceguard.Guard
	hostname    string
	caps        sysinfo.Capabilities
	cfg         *config.NodeConfig
	edgeRunner  *extract.Runner
	ollamaModel string
}

func New(cfg *config.NodeConfig, guard *resourceguard.Guard) (*Node, error) {
	hostname, _ := os.Hostname()
	caps := sysinfo.Probe()

	fetchCfg := cfg.Fetch
	if os.Getenv("FETCH_MODE") == "" {
		fetchCfg = fetch.DefaultConfig(parseFetchMode(caps.FetchMode))
	}

	node := &Node{
		api:         nodeapi.New(cfg.SyftinAPIURL, cfg.NodeToken),
		fetch:       fetch.New(fetchCfg),
		guard:       guard,
		hostname:    hostname,
		caps:        caps,
		cfg:         cfg,
		ollamaModel: cfg.OllamaModel,
	}
	node.bindHardwareCaps()
	if guard != nil {
		guard.RegisterRuntimeReset(fetch.RequestRuntimeReset)
	}
	return node, nil
}

func (n *Node) bindHardwareCaps() {
	if n.guard == nil {
		return
	}
	n.guard.SetSystemContext(
		n.caps.HasGPU,
		n.caps.GpuVRAMGB,
		n.caps.RamGB,
		n.caps.CPUCores,
	)
}

func parseFetchMode(raw string) fetch.Mode {
	switch raw {
	case "http":
		return fetch.ModeHTTP
	case "playwright":
		return fetch.ModePlaywright
	default:
		return fetch.ModeAuto
	}
}

func (n *Node) Register(ctx context.Context) error {
	log.Printf(
		"system profile: %s %s, %.1fGB RAM, %d cores, tier=%s, fetch=%s, playwright=%v, metered=%v, gpu_vram=%.1f, gpu_infer=%v",
		n.caps.OS, n.caps.Arch, n.caps.RamGB, n.caps.CPUCores,
		n.caps.RecommendedTier, n.caps.FetchMode, n.caps.PlaywrightReady,
		n.caps.ConnectionMetered, n.caps.GpuVRAMGB, n.caps.GpuInferenceReady,
	)
	if n.edgeInferenceEnabled() {
		if err := llm.ModelAvailable(ctx, n.cfg.OllamaBaseURL, n.cfg.OllamaModel); err != nil {
			log.Printf("edge gpu inference: ollama not ready (%v) — will fetch HTML only until Ollama is available", err)
		} else {
			log.Printf("edge gpu inference enabled — model %s at %s", n.cfg.OllamaModel, n.cfg.OllamaBaseURL)
		}
	}
	return n.syncRegister(ctx)
}

func (n *Node) edgeInferenceEnabled() bool {
	if n.guard == nil {
		return false
	}
	return resourceguard.GPUInferenceAllowed(
		n.caps.HasGPU,
		n.caps.GpuVRAMGB,
		n.guard.Config().EnableGPUInference,
	)
}

func (n *Node) edgeRunnerInstance() *extract.Runner {
	if n.edgeRunner == nil {
		n.edgeRunner = extract.NewRunner(extract.Config{
			Fetch:         n.cfg.Fetch,
			OllamaBaseURL: n.cfg.OllamaBaseURL,
			OllamaModel:   n.cfg.OllamaModel,
		})
	}
	return n.edgeRunner
}

func (n *Node) syncRegister(ctx context.Context) error {
	var telemetry *resourceguard.Telemetry
	if n.guard != nil {
		t := n.guard.Telemetry(n.caps.ConnectionMetered)
		telemetry = &t
	}
	result, err := n.api.Register(ctx, n.hostname, n.caps, telemetry)
	if err != nil {
		return err
	}
	if n.guard != nil && result != nil && result.ResourceSettings != nil {
		cfg := n.guard.Config()
		resourceguard.ApplyRemote(&cfg, result.ResourceSettings)
		n.guard.Update(cfg)
	}
	return nil
}

func (n *Node) RefreshMetered() bool {
	n.caps.ConnectionMetered = sysinfo.DetectMeteredConnection()
	return n.caps.ConnectionMetered
}

func (n *Node) LogGuardStatus() {
	if n.guard == nil {
		return
	}
	n.guard.LogStatus(n.caps.ConnectionMetered)
}

func (n *Node) ReportTelemetry(ctx context.Context) {
	if n.guard == nil {
		return
	}
	t := n.guard.Telemetry(n.caps.ConnectionMetered)
	if err := n.api.ReportTelemetry(ctx, n.hostname, t); err != nil {
		log.Printf("telemetry: %v", err)
	}
}

func (n *Node) RunOnce(ctx context.Context) error {
	n.RefreshMetered()

	if err := n.syncRegister(ctx); err != nil {
		log.Printf("register: %v", err)
	}

	if n.guard != nil {
		allowed, reason := n.guard.AllowWork(n.caps.ConnectionMetered)
		if !allowed {
			if reason != resourceguard.PauseNone {
				log.Printf("resource guard paused: %s", reason)
			}
			return nil
		}
		n.guard.WaitBeforeTask(ctx)
	}

	task, err := n.api.ClaimTask(ctx, n.hostname)
	if err != nil {
		return err
	}
	if task == nil {
		return nil
	}

	ft := FetchTask{
		ID:            task.ID,
		JobID:         task.JobID,
		TargetURL:     task.TargetURL,
		Domain:        task.Domain,
		ExampleSchema: task.ExampleSchema,
	}

	log.Printf("fetching %s for task %s", ft.Domain, ft.ID)
	fetchCtx := ctx
	var cancelFetch context.CancelFunc
	if n.guard != nil {
		fetchCtx, cancelFetch = n.guard.WorkContext(ctx)
	}
	if cancelFetch != nil {
		defer cancelFetch()
	}
	html, _, method, err := n.fetch.FetchHTML(fetchCtx, ft.TargetURL)
	if err != nil {
		if fetchCtx.Err() != nil {
			_ = n.api.FailTask(ctx, ft.ID, "paused: user activity detected")
			return nil
		}
		_ = n.api.FailTask(ctx, ft.ID, err.Error())
		return fmt.Errorf("fetch %s: %w", ft.ID, err)
	}

	log.Printf("fetched %d bytes via %s", len(html), method)
	if len(html) > 2_000_000 {
		return fmt.Errorf("html too large")
	}

	if n.edgeInferenceEnabled() && len(ft.ExampleSchema) > 0 {
		runner := n.edgeRunnerInstance()
		result, inferErr := runner.ExtractFromHTML(fetchCtx, html, ft.Domain, ft.ExampleSchema)
		if inferErr == nil {
			log.Printf("edge gpu inference: %d records parsed locally", result.RecordCount)
			return n.api.CompleteTaskWithInference(
				ctx, ft.ID, html, result.Output, true, n.ollamaModel,
			)
		}
		log.Printf("edge gpu inference failed, submitting HTML only: %v", inferErr)
	}

	return n.api.CompleteTask(ctx, ft.ID, html)
}

// Capabilities exposes the last probe result (for tests and logging).
func (n *Node) Capabilities() sysinfo.Capabilities {
	return n.caps
}

// ValidateConfig ensures required env vars are present before startup.
func ValidateConfig() error {
	_, err := config.LoadNode()
	if err != nil {
		return fmt.Errorf("%w — run the installer from Contributor → Install node app", err)
	}
	return nil
}
