#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running Syftin domain compliance benchmarks (requires Ollama + network)..."
go run ./cmd/benchmark "$@"
