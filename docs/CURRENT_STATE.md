# Current state

Checkpoint date: November 14, 2026.

Repository baseline: the current published and deployed `main` household release, including Living Overworld 1.0, Parent Review Enhancements, LAN HTTP payment compatibility, and Money History totals.

Living Overworld seasonal-art milestone: the Product Owner accepted cohesive autumn and winter artwork with separate mobile and desktop masters. The retired modular renderer, coordinate editor, experimental scene layouts, and their capture tooling have been removed from the active project. Spring and summer temporarily use the accepted autumn scene until their own artwork milestone. See [Living Overworld restart review](LIVING_OVERWORLD_RESTART_REVIEW.md).

## Living Overworld seasonal-art milestone

The active Living Overworld presentation now uses a deliberately small layer stack: atmospheric sky, celestial bodies and clouds, one cohesive seasonal illustration, then independent lighting and weather treatments. It does not assemble terrain or landmarks from individually positioned scenery objects.

Implemented and verified:

- Accepted autumn and winter landscapes with distinct geography and a shared softly illustrated, Minecraft-inspired visual language.
- Mobile-first 1774 x 887 masters and 2172 x 724 desktop crop masters selected responsively with one semantic picture element.
- A transparent application header and a complete mobile composition with visible sky, terrain, and an unclipped structure.
- Automatic meteorological seasons in `America/Los_Angeles`.
- Morning, day, evening, and night lighting using the existing Seattle-area sunrise/sunset response plus deterministic fallback periods.
- A detailed round moon with eight deterministic phases, plus a reduced-size sun; celestial bodies and clouds render behind the seasonal scenery so mountains and structures can occlude them naturally.
- Actual cached Open-Meteo appearance data driving clear, partly cloudy, cloudy, rain, snow, and fog treatments, with stale and neutral-fallback status.
- Seven-day adjacent-season transitions with controlled image mounting and responsive artwork selection.
- Spring and summer intentionally fall back to autumn artwork until separate seasonal artwork is approved.
- Creatures and foreground scenery are absent from this simplified renderer and deferred to a later bounded milestone.
- 50 automated tests, TypeScript checks, production build, and all 35 isolated browser QA workflows pass at this milestone.

Intentionally outside this milestone:

- Persistent snow accumulation, environmental simulation, and generalized wind response.
- Continuous celestial travel and asset-format conversion.
- Creature and foreground layers, creature interaction, game mechanics, pathfinding, and chore-triggered scenery reactions.
- Final rain and fog art direction. The existing functional weather layer remains available, but visual refinement is the next planned milestone.

This seasonal-art milestone changes only client presentation and repository documentation. It introduces no schema, API, authentication, accounting, dependency, port, firewall, or startup change. Release evidence and the cleanup inventory are recorded in the [restart review](LIVING_OVERWORLD_RESTART_REVIEW.md).

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

- 50 automated tests pass across eight test files.
- TypeScript client and server checks pass.
- Production build passes.
- All 35 isolated browser workflows pass on desktop and 390 px mobile width.
- Two-client persistence, claim/undo, full-month recurrence projections, future-snapshot isolation, detail isolation, PIN continuation, comments, adjusted awards, reduction validation, legacy values, bulk coexistence, exact retries, payments, corrections, every theme, responsive Living Overworld art, celestial layering, night readability, reduced motion, assets, and sign-out are covered.
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
