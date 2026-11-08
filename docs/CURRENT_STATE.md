# Current state

Checkpoint date: November 7, 2026.

Repository baseline: the current published `main` household release, including Parent Review Enhancements, LAN HTTP payment compatibility, and Money History totals.

Sensei is a working, privately deployed household application for one child and one household. This repository checkpoint preserves the real application source without publishing its live database or workstation configuration.

## Completed capabilities

### Checklist and scheduling

- Monday–Sunday weeks in `America/Los_Angeles`.
- Default daily dishes chore and Sunday room chore.
- Daily, selected-weekday, weekly, and one-time custom schedules.
- Effective-dated recurring edits and archives; current-week snapshots stay stable.
- Server-generated weeks on demand, with no rollover scheduler.
- Child claim and undo for today and yesterday only.
- Server rejection of future, expired, stale-page, or finalized mutations.

### Parent review and allowance

- PIN-protected Parent Mode with seven-day server sessions and manual sign-out.
- Shared chore details on the weeksheet, mobile checklist, grace-period list, and calendar.
- Separate checkbox and detail interactions: opening details never claims or undoes a chore.
- Protected per-occurrence approval and rejection directly from a pending claim's details.
- Optional parent comments on individual approvals and rejections.
- Per-occurrence final award adjustment without changing the snapshotted scheduled reward.
- Server-required explanation for an award below the scheduled reward.
- Quarter-dollar validation for new/edited scheduled rewards and changed individual awards; unchanged legacy snapshots remain valid.
- Child-visible scheduled/final amounts and parent explanations in chore details, plus compact expandable decision history.
- Parent PIN continuation preserves the selected chore and returns focus to its originating row.
- Exact-snapshot bulk approval; deselected claims remain pending.
- Historical parent override and direct completion of one-time chores.
- One earning transaction per approved occurrence.
- Rolling unpaid balance, partial/full payments, corrections, and audit history.
- Money History totals for the current household month, lifetime earned, lifetime paid, and available balance.
- Payment and correction idempotency keys remain available on LAN HTTP clients that do not expose `crypto.randomUUID()`.
- Manual SQLite export; restoration remains an external maintenance operation.

### Interface and themes

- Responsive weekly checklist and monthly historical calendar.
- Calendar markers for approved earnings, pending claims, and missed chores.
- NovaPay, Sensei Classic, and Overworld Adventure themes.
- Device-local theme preference in the global header.
- Overworld seasonal crossfades, day/night lighting, cached decorative weather, animated animals, motion toggle, and reduced-motion behavior.
- Overworld daytime animals are fully replaced at night by bounded, weighted encounters: zombies, skeletons, Endermen, and chicken jockeys.
- Night encounters use original local sprite sheets, randomized lanes/directions/timing, a three-creature cap, finite lifetimes, hidden-page suspension, and a static reduced-motion presentation.

### Hosting

- One Node process serves the built client and same-origin API.
- SQLite uses WAL mode, foreign keys, full synchronous writes, constraints, and transactions.
- The current household installation starts automatically on Windows and is restricted to its private LAN interface.
- Deployment-specific paths, addresses, firewall configuration, startup task, database, and logs are deliberately absent from Git.

## Verification baseline

- 40 automated tests pass across seven test files.
- TypeScript client and server checks pass.
- Production build passes.
- Isolated browser workflow passes on desktop and 390 px mobile width.
- Two-client persistence, claim/undo, detail isolation, PIN continuation, comments, adjusted awards, reduction validation, legacy values, bulk coexistence, exact retries, payments, corrections, themes, deterministic night-encounter rarity, day/night replacement, encounter despawn, reduced motion, assets, and sign-out are covered.
- Runtime database integrity was verified before repository preparation; the database itself is not included.

## Known limitations and intentional boundaries

- HTTP does not encrypt traffic. The approved deployment is private-LAN only.
- No offline synchronization, service worker, PWA installation contract, cloud backup, or public hosting.
- One child and one household; parent PINs are authenticators, not user accounts.
- No in-app restore workflow.
- Decorative weather depends on Open-Meteo but falls back to cached or neutral conditions.
- The Windows startup launcher is intentionally ignored because it contains workstation-specific paths and binding details.
- No reusable source or artwork license has been declared in this checkpoint.

## Repository status at this checkpoint

The household release described above remains published and deployed. The Overworld Night Encounters work is a verified local visual checkpoint only: it has not been pushed, published, deployed, or used to restart the household service. It changes no schema, dependency, business logic, network, startup, authentication, or household data.
