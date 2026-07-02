#!/usr/bin/env bash
# Pre-flight checks before inviting pilot buyers or contributors.
# Usage: bash scripts/pilot-launch-check.sh [SITE_URL]
# Example: bash scripts/pilot-launch-check.sh http://localhost:3000

set -euo pipefail

SITE="${1:-${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}}"
SITE="${SITE%/}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASES="${ROOT}/web/public/releases"

pass=0
warn=0
fail=0

ok() { echo "  ✓ $*"; pass=$((pass + 1)); }
note() { echo "  ! $*"; warn=$((warn + 1)); }
bad() { echo "  ✗ $*"; fail=$((fail + 1)); }

echo ""
echo "Syftin pilot launch check"
echo "Site: ${SITE}"
echo "─────────────────────────"
echo ""

echo "Migrations (local files)"
latest="$(ls -1 "${ROOT}/supabase/migrations"/*.sql 2>/dev/null | tail -1 || true)"
if [[ -n "$latest" ]]; then
  ok "Latest migration file: $(basename "$latest")"
else
  bad "No migration files found"
fi

echo ""
echo "Node release binaries"
if [[ -f "${RELEASES}/manifest.json" ]]; then
  ok "manifest.json present"
  for asset in syftin-node-darwin-arm64 syftin-node-linux-amd64; do
    if [[ -f "${RELEASES}/${asset}" ]]; then
      ok "${asset}"
    else
      note "${asset} missing — set SYFTIN_GITHUB_REPO or run build-node-release.sh"
    fi
  done
else
  note "No local binaries — installers need GitHub Releases or source build"
  echo "       bash worker/scripts/build-node-release.sh darwin-arm64"
fi

echo ""
echo "Environment (web/.env.local)"
env_file="${ROOT}/web/.env.local"
if [[ -f "$env_file" ]]; then
  ok ".env.local exists"
  for key in NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY CRON_SECRET; do
    if grep -q "^${key}=" "$env_file" 2>/dev/null; then
      ok "$key set"
    else
      note "$key not set in .env.local"
    fi
  done
else
  note "web/.env.local not found (expected for local dev)"
fi

echo ""
echo "HTTP probes"
if command -v curl >/dev/null 2>&1; then
  code="$(curl -s -o /dev/null -w "%{http_code}" "${SITE}/api/health" || echo "000")"
  if [[ "$code" == "200" ]]; then
    ok "/api/health → 200"
  else
    bad "/api/health → ${code} (is npm run dev running?)"
  fi

  manifest_code="$(curl -s -o /dev/null -w "%{http_code}" "${SITE}/api/releases/manifest" || echo "000")"
  if [[ "$manifest_code" == "200" ]]; then
    ok "/api/releases/manifest → 200"
  else
    note "/api/releases/manifest → ${manifest_code}"
  fi
else
  note "curl not available — skip HTTP probes"
fi

echo ""
echo "─────────────────────────"
echo "Passed: ${pass}  Warnings: ${warn}  Failed: ${fail}"
echo ""

if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
exit 0
