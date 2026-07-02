#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PLAYWRIGHT_VERSION="v0.5700.1"

echo "Installing Playwright Chromium for the Go worker (${PLAYWRIGHT_VERSION})..."
go run "github.com/playwright-community/playwright-go/cmd/playwright@${PLAYWRIGHT_VERSION}" install chromium

echo "Done. Start the worker with: go run ./cmd/worker"
