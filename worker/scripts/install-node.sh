#!/usr/bin/env bash
# Syftin edge node — one-command installer (no coding required).
# Usage:
#   curl -fsSL "https://YOUR_SITE/install-node.sh" | bash -s -- --token sftn_xxx --api https://YOUR_SITE
# Or from this repo:
#   bash worker/scripts/install-node.sh --token sftn_xxx --api http://localhost:3000

set -euo pipefail

SYFTIN_VERSION="${SYFTIN_VERSION:-0.1.0}"
INSTALL_DIR="${SYFTIN_INSTALL_DIR:-$HOME/.syftin/node}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=versions.env
if [[ -f "$SCRIPT_DIR/versions.env" ]]; then
  source "$SCRIPT_DIR/versions.env"
fi
PLAYWRIGHT_VERSION="${PLAYWRIGHT_GO_VERSION:-v0.5700.1}"
TOKEN=""
API_URL=""

usage() {
  cat <<'EOF'
Syftin edge node installer

Required:
  --token TOKEN    Device token from Contributor → My devices
  --api URL        Your Syftin site URL (e.g. https://syftin.io)

Optional:
  --dir PATH       Install directory (default: ~/.syftin/node)
  --no-service     Skip background service setup
  --docker         Use Docker instead of native binary

Example:
  curl -fsSL "https://syftin.io/install-node.sh" | bash -s -- \
    --token sftn_abc123 --api https://syftin.io
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) TOKEN="$2"; shift 2 ;;
    --api) API_URL="${2%/}"; shift 2 ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --no-service) NO_SERVICE=1; shift ;;
    --docker) USE_DOCKER=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$TOKEN" || -z "$API_URL" ]]; then
  echo "Error: --token and --api are required."
  usage
  exit 1
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_SRC=""
if [[ -f "$SCRIPT_DIR/../cmd/node/main.go" ]]; then
  WORKER_SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [[ -f "$SCRIPT_DIR/../../worker/cmd/node/main.go" ]]; then
  WORKER_SRC="$(cd "$SCRIPT_DIR/../../worker" && pwd)"
fi

log() { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }

mkdir -p "$INSTALL_DIR"

install_playwright() {
  if [[ -n "${SKIP_PLAYWRIGHT:-}" ]]; then
    warn "Skipping Playwright install (SKIP_PLAYWRIGHT set)"
    return 0
  fi

  export SYFTIN_API_URL="${API_URL}"
  export SYFTIN_INSTALL_DIR="${INSTALL_DIR}"

  # 1) Prebuilt syftin-playwright CLI from /releases (no Go, no system Node)
  if download_playwright_cli; then
    return 0
  fi

  # 2) Go-based install when developing from source
  if command -v go >/dev/null 2>&1; then
    log "Installing Chromium for JavaScript-heavy pages (one-time, ~150MB)…"
    if (cd "${WORKER_SRC:-$INSTALL_DIR}" && go run "github.com/playwright-community/playwright-go/cmd/playwright@${PLAYWRIGHT_VERSION}" install chromium); then
      ok "Playwright Chromium ready"
      return 0
    fi
    warn "Go Playwright install failed — trying standalone installer"
  fi

  # 3) Standalone bash installer (bundled Node driver from CDN)
  local pw_script="${SCRIPT_DIR}/install-playwright-standalone.sh"
  if [[ -f "$pw_script" ]]; then
    bash "$pw_script" && return 0
  fi
  if curl -fsSL "${API_URL}/install-playwright.sh" | bash; then
    ok "Playwright Chromium ready"
    return 0
  fi

  warn "Playwright install failed — node will use HTTP-only fetches"
}

download_playwright_cli() {
  local url="${API_URL}/releases/syftin-playwright-${OS}-${ARCH}"
  local dest="${INSTALL_DIR}/syftin-playwright"
  if [[ -x "$dest" ]]; then
    log "Installing Chromium via syftin-playwright…"
    if "$dest" install chromium; then
      ok "Playwright Chromium ready"
      return 0
    fi
    return 1
  fi
  log "Downloading syftin-playwright for ${OS}/${ARCH}…"
  if curl -fsSL "$url" -o "$dest"; then
    chmod +x "$dest"
    log "Installing Chromium for JavaScript-heavy pages (one-time, ~150MB)…"
    if "$dest" install chromium; then
      ok "Playwright Chromium ready"
      return 0
    fi
  fi
  rm -f "$dest" 2>/dev/null || true
  return 1
}

build_from_source() {
  if [[ -z "$WORKER_SRC" ]]; then
    return 1
  fi
  log "Building syftin-node from source…"
  (cd "$WORKER_SRC" && go build -ldflags "-s -w" -o "$INSTALL_DIR/syftin-node" ./cmd/node)
  chmod +x "$INSTALL_DIR/syftin-node"
  ok "Built $INSTALL_DIR/syftin-node"
  return 0
}

download_binary() {
  local name="syftin-node-${OS}-${ARCH}"
  local github_base="${SYFTIN_GITHUB_RELEASES:-https://github.com/syftin/syftin/releases/latest/download}"
  local urls=(
    "${API_URL}/releases/${name}"
    "${github_base}/${name}"
  )

  for url in "${urls[@]}"; do
    log "Downloading prebuilt node from ${url}…"
    if curl -fsSL "$url" -o "$INSTALL_DIR/syftin-node"; then
      chmod +x "$INSTALL_DIR/syftin-node"
      ok "Downloaded syftin-node"
      return 0
    fi
  done
  return 1
}

install_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  log "Starting Syftin node via Docker…"
  docker pull "syftin/node:${SYFTIN_VERSION}" 2>/dev/null || docker pull "syftin/node:latest" 2>/dev/null || true
  docker rm -f syftin-node 2>/dev/null || true
  docker run -d --name syftin-node --restart unless-stopped \
    -e "NODE_TOKEN=${TOKEN}" \
    -e "SYFTIN_API_URL=${API_URL}" \
    "syftin/node:${SYFTIN_VERSION}" 2>/dev/null \
    || docker run -d --name syftin-node --restart unless-stopped \
    -e "NODE_TOKEN=${TOKEN}" \
    -e "SYFTIN_API_URL=${API_URL}" \
    syftin/node:latest
  ok "Docker container syftin-node is running"
  return 0
}

write_config() {
  cat > "$INSTALL_DIR/config.env" <<EOF
# Syftin edge node — generated by install-node.sh
NODE_TOKEN=${TOKEN}
SYFTIN_API_URL=${API_URL}
NODE_POLL_INTERVAL=10s
EOF
  chmod 600 "$INSTALL_DIR/config.env"
  ok "Wrote $INSTALL_DIR/config.env"
}

install_native_binary() {
  if [[ -x "$INSTALL_DIR/syftin-node" ]]; then
    ok "syftin-node already installed"
    return 0
  fi
  if [[ "${USE_DOCKER:-}" == "1" ]] && install_docker; then
    return 0
  fi
  if download_binary || build_from_source; then
    return 0
  fi
  if install_docker; then
    return 0
  fi
  echo "Could not install syftin-node automatically."
  echo "Open ${API_URL}/contributor/help for step-by-step options."
  exit 1
}

setup_launchd() {
  local plist="$HOME/Library/LaunchAgents/io.syftin.node.plist"
  log "Setting up background service (macOS)…"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>io.syftin.node</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/syftin-node</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_TOKEN</key>
    <string>${TOKEN}</string>
    <key>SYFTIN_API_URL</key>
    <string>${API_URL}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${INSTALL_DIR}/node.log</string>
  <key>StandardErrorPath</key>
  <string>${INSTALL_DIR}/node.error.log</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/$(id -u)/io.syftin.node" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$plist"
  launchctl enable "gui/$(id -u)/io.syftin.node"
  launchctl kickstart -k "gui/$(id -u)/io.syftin.node"
  ok "Background service started (logs: $INSTALL_DIR/node.log)"
}

setup_systemd_user() {
  local unit_dir="$HOME/.config/systemd/user"
  mkdir -p "$unit_dir"
  log "Setting up background service (Linux)…"
  cat > "$unit_dir/syftin-node.service" <<EOF
[Unit]
Description=Syftin edge fetch node
After=network-online.target

[Service]
Type=simple
EnvironmentFile=${INSTALL_DIR}/config.env
ExecStart=${INSTALL_DIR}/syftin-node
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now syftin-node.service
  ok "Background service started (systemctl --user status syftin-node)"
}

start_foreground_hint() {
  warn "Service setup skipped. Run manually:"
  echo "  export NODE_TOKEN='${TOKEN}' SYFTIN_API_URL='${API_URL}'"
  echo "  ${INSTALL_DIR}/syftin-node"
}

main() {
  echo ""
  echo "  Syftin edge node installer"
  echo "  ─────────────────────────"
  echo ""

  if [[ "${USE_DOCKER:-}" == "1" ]] && install_docker; then
    echo ""
    ok "Done! Check Contributor → My devices — status should show online within 30 seconds."
    exit 0
  fi

  install_native_binary
  install_playwright
  write_config

  if [[ "${NO_SERVICE:-}" != "1" && -x "$INSTALL_DIR/syftin-node" ]]; then
    case "$OS" in
      darwin) setup_launchd ;;
      linux)
        if command -v systemctl >/dev/null 2>&1; then
          setup_systemd_user
        else
          start_foreground_hint
        fi
        ;;
      *) start_foreground_hint ;;
    esac
  else
    start_foreground_hint
  fi

  echo ""
  ok "Done! Open ${API_URL}/contributor/nodes — your device should show online soon."
  echo "   Help & troubleshooting: ${API_URL}/contributor/help"
  echo ""
}

main
