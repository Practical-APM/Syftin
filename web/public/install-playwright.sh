#!/usr/bin/env bash
# Install Playwright driver + Chromium for syftin-node — no Go or system Node.js required.
# The driver zip bundles Node; we use it to run `playwright install chromium`.
#
# Usage:
#   bash worker/scripts/install-playwright-standalone.sh
#   curl -fsSL "https://syftin.io/install-playwright.sh" | bash

set -euo pipefail

PLAYWRIGHT_DRIVER_VERSION="${PLAYWRIGHT_DRIVER_VERSION:-1.57.0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
if [[ -n "$SCRIPT_DIR" && -f "${SCRIPT_DIR}/versions.env" ]]; then
  # shellcheck source=versions.env
  source "${SCRIPT_DIR}/versions.env"
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

log() { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }

cache_root() {
  case "$OS" in
    darwin) printf '%s' "${HOME}/Library/Caches" ;;
    linux) printf '%s' "${HOME}/.cache" ;;
    *) printf '%s' "${HOME}/.cache" ;;
  esac
}

browser_cache_root() {
  printf '%s/ms-playwright' "$(cache_root)"
}

driver_dir() {
  if [[ -n "${PLAYWRIGHT_DRIVER_PATH:-}" ]]; then
    printf '%s' "$PLAYWRIGHT_DRIVER_PATH"
    return
  fi
  printf '%s/ms-playwright-go/%s' "$(cache_root)" "$PLAYWRIGHT_DRIVER_VERSION"
}

driver_platform() {
  case "$OS" in
    darwin)
      if [[ "$ARCH" == "arm64" ]]; then
        echo "mac-arm64"
      else
        echo "mac"
      fi
      ;;
    linux)
      if [[ "$ARCH" == "arm64" ]]; then
        echo "linux-arm64"
      else
        echo "linux"
      fi
      ;;
    *)
      echo "unsupported"
      ;;
  esac
}

chromium_installed() {
  local root
  root="$(browser_cache_root)"
  if [[ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ]]; then
    root="$PLAYWRIGHT_BROWSERS_PATH"
  fi
  compgen -G "${root}/chromium-"* >/dev/null 2>&1
}

driver_installed() {
  local dir
  dir="$(driver_dir)"
  [[ -f "${dir}/package/cli.js" && -x "${dir}/node" ]]
}

download_driver() {
  local platform url tmpdir
  platform="$(driver_platform)"
  if [[ "$platform" == "unsupported" ]]; then
    warn "Unsupported OS for Playwright driver: ${OS}/${ARCH}"
    return 1
  fi

  local dir
  dir="$(driver_dir)"
  mkdir -p "$dir"

  url="https://cdn.playwright.dev/builds/driver/playwright-${PLAYWRIGHT_DRIVER_VERSION}-${platform}.zip"
  log "Downloading Playwright driver ${PLAYWRIGHT_DRIVER_VERSION} (${platform})…"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  if ! curl -fsSL "$url" -o "${tmpdir}/driver.zip"; then
    url="https://playwright.azureedge.net/builds/driver/playwright-${PLAYWRIGHT_DRIVER_VERSION}-${platform}.zip"
    curl -fsSL "$url" -o "${tmpdir}/driver.zip"
  fi

  unzip -q -o "${tmpdir}/driver.zip" -d "$dir"
  chmod +x "${dir}/node" 2>/dev/null || true
  ok "Playwright driver ready at ${dir}"
}

install_chromium() {
  local dir
  dir="$(driver_dir)"
  log "Installing Chromium for JavaScript-heavy pages (one-time, ~150MB)…"
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
    "${dir}/node" "${dir}/package/cli.js" install chromium
  ok "Chromium ready — Ranger tier fetches enabled"
}

download_playwright_cli() {
  local api="${SYFTIN_API_URL:-${API_URL:-}}"
  local install_dir="${SYFTIN_INSTALL_DIR:-${HOME}/.syftin/node}"
  if [[ -z "$api" ]]; then
    return 1
  fi
  mkdir -p "$install_dir"
  local url="${api}/releases/syftin-playwright-${OS}-${ARCH}"
  log "Downloading syftin-playwright helper…"
  if curl -fsSL "$url" -o "${install_dir}/syftin-playwright"; then
    chmod +x "${install_dir}/syftin-playwright"
    "${install_dir}/syftin-playwright" install chromium
    ok "Chromium installed via syftin-playwright"
    return 0
  fi
  return 1
}

main() {
  if chromium_installed; then
    ok "Chromium already installed"
    exit 0
  fi

  if download_playwright_cli 2>/dev/null; then
    exit 0
  fi

  if ! driver_installed; then
    download_driver
  else
    ok "Playwright driver already present"
  fi

  install_chromium
}

main "$@"
