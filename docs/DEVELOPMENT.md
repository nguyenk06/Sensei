# Development

## Requirements

- Node.js 24 LTS (`>=24 <25`)
- pnpm 11.25.0
- Local filesystem storage suitable for SQLite
- Chrome only for the current Playwright browser-smoke script

Native dependencies (`better-sqlite3` and `argon2`) normally use compatible prebuilt binaries. Unexpected native compilation requirements should be treated as an environment issue rather than worked around with unrelated global tooling.

## Install and run

```powershell
pnpm install
pnpm dev:server
```

In a second terminal, run the Vite development client:

```powershell
pnpm dev
```

For the built same-origin application:

```powershell
pnpm build
pnpm start
```

The safe default is `http://127.0.0.1:3000` with data stored in `.local-data/sensei.sqlite`.

## Configuration

Copy `.env.example` values into your process environment or local untracked environment file. Important settings:

| Variable | Purpose | Safe default |
| --- | --- | --- |
| `SENSEI_HOST` | Listening interface | `127.0.0.1` |
| `SENSEI_PORT` | HTTP port | `3000` |
| `SENSEI_TIMEZONE` | Household date boundary | `America/Los_Angeles` |
| `SENSEI_DATA_DIR` | SQLite directory | `.local-data` |
| `SENSEI_LOG_DIR` | Log directory | `.local-data/logs` |

Do not commit a real `.env`, database, backup, log, PIN, private address, firewall rule, or startup-task export.

## Parent credentials

The first parent PIN can be created in Parent Mode. A local administrator may configure two labeled authenticators with `scripts/set-parent-pins.ts` by supplying these process variables:

- `SENSEI_PARENT_ONE_PIN`
- `SENSEI_PARENT_TWO_PIN`
- optional `SENSEI_PARENT_ONE_LABEL`
- optional `SENSEI_PARENT_TWO_LABEL`

Run the script only against the intended local `SENSEI_DATA_DIR`. It revokes active parent sessions. Never place PIN values in source, documentation, shell scripts, or Git.

## Verification

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm qa:browser
```

`qa:browser` creates a temporary database, starts an isolated server, exercises two clients and Parent Mode, captures synthetic screenshots under ignored `.qa/`, and deletes the temporary database. The current script expects Chrome at its conventional Windows installation path.

The browser workflow verifies:

- shared claim/undo state;
- parent setup, authorization, and sign-out;
- independent checkbox and chore-detail interactions;
- PIN continuation back to the selected pending chore;
- individual approval/rejection, optional comments, adjusted awards, required reduction explanations, exact-retry idempotency, and itemized bulk coexistence;
- quarter-dollar validation and unchanged legacy reward compatibility;
- calendar-to-chore dialog transitions, focus containment, and opener-focus restoration;
- payment, correction, and export behavior;
- all three themes and device-local persistence;
- Overworld assets, scene layers, motion, and reduced-motion behavior;
- desktop/mobile overflow and header ordering;
- calendar navigation and outcome badges;
- no-store cache headers and unexpected browser errors.

For verification without replacing a running household build, direct Vite and TypeScript output to an ignored QA directory and point the browser workflow at that client build:

```powershell
pnpm exec vite build --outDir .qa/parent-review-enhancements/client --emptyOutDir
pnpm exec tsc -p tsconfig.server.json --outDir .qa/parent-review-enhancements/server
$env:SENSEI_QA_STATIC_DIR = '.qa/parent-review-enhancements/client'
pnpm qa:browser
```

This preserves the live `dist/` directory while still exercising a production-mode client, compiled server, temporary database, and isolated browser clients.

## Data safety

- Use a separate data directory for development and household operation.
- Back up SQLite through its backup API or the authenticated export endpoint; do not copy a live WAL database as if it were a single-file snapshot.
- Do not edit household rows manually to test dates, approvals, or balances.
- Test time boundaries with injected clocks in automated tests.
- The API is the security boundary; client controls are presentation only.

## LAN and startup deployment

Sensei can bind to a specific private interface, but LAN exposure is environment-specific. Confirm a stable private address and apply a private-profile, subnet-limited firewall rule outside the repository. Never bind broadly or configure public router forwarding for this application.

The working household installation uses a hidden Windows scheduled task and a workstation-specific launcher. That launcher is intentionally ignored because it contains local paths and binding details. Create and review deployment configuration separately; do not infer it from this public repository.

## Themes and assets

See [THEMES.md](THEMES.md) before adding visual variants. Reuse semantic tokens and shared feature components. Keep new assets local, optimized, attributable, responsive, and compatible with reduced motion. Do not introduce a second component tree merely to change appearance.
