# Contributor node release binaries

Prebuilt `syftin-node` and `syftin-playwright` binaries are **not committed** (too large).

## Local development

```bash
bash worker/scripts/build-node-release.sh darwin-arm64   # current machine only
# or
bash worker/scripts/build-node-release.sh all            # all platforms (needs Go cross-compile)
```

Binaries are written here and served at `/releases/syftin-node-{os}-{arch}`.

## Production

GitHub Actions builds on tag push (`v*`). Set in Vercel / env:

```env
SYFTIN_GITHUB_REPO=your-org/projectS
SYFTIN_RELEASE_TAG=v0.1.0
```

`/releases/*` redirects to GitHub release assets when local files are absent.

## One-file installers (contributor download)

Generated at deploy:

```bash
cd web
NEXT_PUBLIC_SITE_URL=https://syftin.io npm run build:installers
```

See `web/public/installers/README.md`. Served at `/installers/*` in production.

## Playwright Chromium (no Go required)

Contributors without Go get Chromium via:

1. `syftin-playwright install chromium` (downloaded from `/releases/`)
2. Fallback: `curl …/install-playwright.sh | bash` (CDN driver + bundled Node)
