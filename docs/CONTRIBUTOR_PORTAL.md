# Contributor portal — how to access

Persona B (worker nodes) uses **`/contributor`**. This is separate from the buyer dashboard at `/dashboard`.

---

## Quick access (local development)

Phase 2 is **on by default** in development (`NODE_ENV=development`).

1. Start the web app: `cd web && npm run dev`
2. Open **http://localhost:3000/contributor**

No login required when Supabase auth is off (typical local setup). You get a demo contributor profile with sample balance and devices.

---

## Production / pilot (magic link)

### 1. Enable Phase 2

```env
NEXT_PUBLIC_PHASE2_ENABLED=true
NEXT_PUBLIC_AUTH_REQUIRED=true
```

### 2. Allow the contributor email

One of:

- Add email in **Admin → Contributor invites** (`/admin/contributor-invites`)
- Or env: `CONTRIBUTOR_INVITE_EMAILS=student@college.edu`
- Or open signup: `CONTRIBUTOR_OPEN=true`

### 3. Sign in

1. Go to **http://localhost:3000/login?next=/contributor**  
   (or click **Contributor sign in** on the login page footer when Phase 2 is enabled)
2. Enter the invited email → magic link
3. After redirect you land on `/contributor`

### 4. Onboarding checklist

| Step | URL | Action |
|------|-----|--------|
| Setup | `/contributor/setup` | UPI ID, display name (hardware tier auto-detected) |
| Devices | `/contributor/nodes` | Register laptop → copy `NODE_TOKEN` (requires UPI in Setup) |
| Install | `/contributor/download` | One-line install — no coding required |
| Help | `/contributor/help` | FAQ, tiers, troubleshooting |
| Network | `/contributor/network` | Pause on mobile data if needed |
| Resources | `/contributor/resources` | Eco / Balanced / Titan CPU & thermal caps |
| Earnings | `/contributor/earnings` | Track balance toward ₹500 payout |

---

## Buyer vs contributor

| Portal | URL | Who |
|--------|-----|-----|
| Buyer | `/dashboard` | Enterprise customers (Persona A) |
| Contributor | `/contributor` | Students / homelab operators (Persona B) |
| Admin | `/admin` | Syftin ops (Persona C) |

The same email can be both a **buyer** (pilot invite) and a **contributor** (contributor invite) — they use different routes after sign-in.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/contributor` redirects to `/dashboard` | Set `NEXT_PUBLIC_PHASE2_ENABLED=true` |
| Redirects to login loop | Email not on contributor invite list |
| "Contributor access denied" | Add email in `/admin/contributor-invites` |
| Demo mode only | Unset `NEXT_PUBLIC_AUTH_REQUIRED` or configure Supabase + invites |
| Stuck on Scout tier (HTTP only) | Re-run installer or `curl -fsSL …/install-playwright.sh \| bash` for Chromium |
| `/releases/syftin-node-*` 404 | Run `bash worker/scripts/build-node-release.sh` locally, or publish a GitHub release tag |

### Chromium / Playwright (automatic)

The one-line installer downloads Chromium for JavaScript-heavy sites (Ranger tier). **No Go or system Node.js required.**

Manual reinstall:

```bash
curl -fsSL "http://localhost:3000/install-playwright.sh" | bash
```

Prebuilt node binaries: `/releases/syftin-node-{darwin|linux}-{arm64|amd64}` (see `web/public/releases/README.md`).

---

*See also: [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)*
