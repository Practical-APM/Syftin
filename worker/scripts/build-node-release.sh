#!/usr/bin/env bash
# Build syftin-node + syftin-playwright for all contributor platforms.
# Outputs to web/public/releases/ for local dev serving at /releases/*
#
# Usage: bash worker/scripts/build-node-release.sh [platform]
#   platform optional: darwin-arm64 | darwin-amd64 | linux-arm64 | linux-amd64 | all

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKER="${ROOT}/worker"
OUT="${ROOT}/web/public/releases"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=versions.env
source "${SCRIPT_DIR}/versions.env"

mkdir -p "$OUT"

build_one() {
  local goos="$1" goarch="$2"
  local suffix="${goos}-${goarch}"
  local node_out="${OUT}/syftin-node-${suffix}"
  local pw_out="${OUT}/syftin-playwright-${suffix}"
  if [[ "$goos" == "windows" ]]; then
    node_out="${node_out}.exe"
    pw_out="${pw_out}.exe"
  fi

  echo "→ Building syftin-node-${suffix}…"
  (cd "$WORKER" && CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
    go build -ldflags "-s -w" -o "$node_out" ./cmd/node)

  echo "→ Building syftin-playwright-${suffix}…"
  (cd "$WORKER" && CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
    go build -ldflags "-s -w" \
      -o "$pw_out" \
      "github.com/playwright-community/playwright-go/cmd/playwright@${PLAYWRIGHT_GO_VERSION}")

  chmod +x "$node_out" "$pw_out" 2>/dev/null || true
}

TARGET="${1:-all}"
case "$TARGET" in
  darwin-arm64) build_one darwin arm64 ;;
  darwin-amd64) build_one darwin amd64 ;;
  linux-arm64) build_one linux arm64 ;;
  linux-amd64) build_one linux amd64 ;;
  windows-amd64) build_one windows amd64 ;;
  all)
    build_one darwin arm64
    build_one darwin amd64
    build_one linux arm64
    build_one linux amd64
    build_one windows amd64
    ;;
  *)
    echo "Unknown platform: $TARGET"
    echo "Use: darwin-arm64 | darwin-amd64 | linux-arm64 | linux-amd64 | windows-amd64 | all"
    exit 1
    ;;
esac

cat > "${OUT}/manifest.json" <<EOF
{
  "version": "${SYFTIN_VERSION}",
  "playwrightGo": "${PLAYWRIGHT_GO_VERSION}",
  "playwrightDriver": "${PLAYWRIGHT_DRIVER_VERSION}",
  "chromiumRevision": "${CHROMIUM_REVISION}",
  "assets": [
    "syftin-node-darwin-arm64",
    "syftin-node-darwin-amd64",
    "syftin-node-linux-arm64",
    "syftin-node-linux-amd64",
    "syftin-playwright-darwin-arm64",
    "syftin-playwright-darwin-amd64",
    "syftin-playwright-linux-arm64",
    "syftin-playwright-linux-amd64",
    "syftin-node-windows-amd64.exe",
    "syftin-playwright-windows-amd64.exe"
  ]
}
EOF

echo "✓ Release binaries in ${OUT}"
ls -lh "$OUT"
