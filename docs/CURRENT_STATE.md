# Current state

Checkpoint date: November 10, 2026.

Repository baseline: the current published and deployed `main` household release, including Living Overworld 1.0, Parent Review Enhancements, LAN HTTP payment compatibility, and Money History totals.

## Living Overworld 1.0

Living Overworld 1.0 is merged and published through composition runtime commit `cc4f3b4`. The latest presentation keeps the 210–250 px desktop banner height while showing the layered 3:1 world at its natural zoomed-out scale, restores the visible lake, uses a transparent header overlay, and removes the unsupported chimney smoke effect. Mobile retains its approved 140 px proportions.

Implemented and verified:

- Layered fixed-camera scenery with consistent spring, summer, autumn, and winter geography.
- Automatic meteorological seasons in `America/Los_Angeles`.
- Morning, day, evening, and night lighting using the existing Seattle-area sunrise/sunset response plus deterministic fallback periods.
- A detailed round moon with eight deterministic phases, motion preferences, reduced-motion handling, hidden-page suspension, and device-local theme selection.
- Actual cached Open-Meteo appearance data driving clear, partly cloudy, cloudy, rain, snow, and fog treatments, with stale and neutral-fallback status.
- Seven-day adjacent-season transitions with controlled image mounting, a 140 px mobile scene, proportional mobile cropping, and controls outside the scenery.
- A weather-, season-, and time-aware population of sheep, pig, cow, chicken, and aquatic axolotl using fixed habitat corridors and CSS-only movement.
- A maximum of three land animals plus one axolotl in clear daytime conditions, with reduced activity during clouds, rain, snow, fog, evening, winter, and night.
- 51 automated tests, TypeScript checks, production build, and all 35 full isolated browser QA workflows passing at the latest Living Overworld 1.0 checkpoint.

Intentionally outside Living Overworld 1.0:

- Persistent snow accumulation, environmental simulation, and generalized wind response.
- Continuous celestial travel and asset-format conversion.
- Creature interaction, game mechanics, pathfinding, and chore-triggered scenery reactions.

The release used a verified SQLite-native online backup, a separate prior-build backup, a production rebuild, and a restart of only the existing `\Sensei - Household Server` task. Post-release checks confirmed the LAN health endpoint, seven-day checklist, 42-day calendar grid, allowance endpoint, current Open-Meteo response, Living Overworld bundle marker, moon and axolotl assets, and live SQLite integrity. No schema, household records, authentication, port, firewall, startup, or network configuration changed. See the [Living Overworld visual review](LIVING_OVERWORLD_VISUAL_REVIEW.md).

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

- Responsive weekly checklist and full monthly calendar showing persisted history plus every expected scheduled chore.
- Future calendar expectations are projected read-only from effective-dated revisions; viewing a month does not materialize or freeze future weekly snapshots.
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

- 41 automated tests pass across seven test files.
- TypeScript client and server checks pass.
- Production build passes.
- Isolated browser workflow passes on desktop and 390 px mobile width.
- Two-client persistence, claim/undo, full-month recurrence projections, future-snapshot isolation, detail isolation, PIN continuation, comments, adjusted awards, reduction validation, legacy values, bulk coexistence, exact retries, payments, corrections, themes, deterministic night-encounter rarity, day/night replacement, encounter despawn, reduced motion, assets, and sign-out are covered.
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

The Overworld Night Encounters checkpoint is published and deployed to the existing household installation. Release used a verified SQLite-native backup, rebuilt the existing production assets, restarted only the established Sensei scheduled task, retained the private-LAN binding, and passed non-mutating health, database-integrity, browser, weekly-board, History, Parent Mode entry, and live night-scene checks. It changed no schema, dependency, business logic, network, startup, authentication, or household data.

The full-calendar expected-chores correction is implemented, verified, published, and deployed. A live check confirmed the newly configured chore appears on its future November dates while the persisted week and occurrence counts remain unchanged. Deployment used a verified SQLite-native backup, required no schema migration, and restarted only the existing Sensei scheduled task.
