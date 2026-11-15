# Current state

Checkpoint date: November 14, 2026.

Repository baseline: the current deployed local `main` household release, including Living Overworld 1.0, Parent Review Enhancements, LAN HTTP payment compatibility, Money History totals, and the Living Overworld atmosphere refinement.

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
- Partly cloudy and cloudy states differ by visible cloud-bank density rather than darkness alone. Rain uses a heavy cloud ceiling and independently timed, nearly vertical fine drops; snow uses a denser, evenly phased field of soft flakes with slow drift; fog uses overlapping ground-level wisps that can temporarily veil terrain and the retreat.
- Temperatures are presented in Celsius and Fahrenheit. Evening and night add a prominent, slowly rotating varied star field, while rare downward comets and meteors use a moving luminous head and fading tail behind the seasonal illustration.
- The development scene control exposes an intuitive celestial-height override: moving the slider right raises the active body, while `Auto` restores sunrise/sunset timing.
- Autumn mobile and desktop alpha edges were tightened to remove the colored halo visible against darker weather skies.
- The accepted autumn-night landscape preserves the approved geography while supplying authored moonlit color, warm retreat windows, and clean transparent skyline edges. It crossfades over the day master at night while independent celestial and weather layers remain active. See [Autumn night integration](LIVING_OVERWORLD_AUTUMN_NIGHT_PROOF.md).
- The sun and moon remain horizontally centered and travel only vertically. Their highest position keeps the complete disk below the transparent header on desktop and portrait mobile; landscape features continue to occlude the body naturally.
- Seven-day adjacent-season transitions with controlled image mounting and responsive artwork selection.
- Spring and summer intentionally fall back to autumn artwork until separate seasonal artwork is approved.
- Creatures and foreground scenery are absent from this simplified renderer and deferred to a later bounded milestone.
- 52 automated tests, TypeScript checks, production build, and all 35 isolated browser QA workflows pass at this local correction checkpoint.

Intentionally outside this milestone:

- Persistent snow accumulation, environmental simulation, and generalized wind response.
- Continuous celestial travel and asset-format conversion.
- Creature and foreground layers, creature interaction, game mechanics, pathfinding, and chore-triggered scenery reactions.
- Additional Product Owner-directed weather tuning beyond the current accepted rain, snow, fog, and cloud treatments.

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

- 51 automated tests pass across eight test files.
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

The Living Overworld seasonal-art milestone is published and deployed from application release commit `b8b4816`. Deployment used a verified SQLite-native online backup, an exact production rebuild, and a restart of only the established `\Sensei - Household Server` task. Post-release verification confirmed the private-LAN health endpoint, seven-day household checklist, allowance history and balances, Parent Mode entry, collapsed History, all four themes, responsive autumn mobile/desktop assets, availability of both winter assets, a clean browser console, and unchanged SQLite integrity and table counts. No schema, API, accounting, authentication, dependency, port, firewall, startup, or household-record change occurred.

The Overworld Night Encounters checkpoint is published and deployed to the existing household installation. Release used a verified SQLite-native backup, rebuilt the existing production assets, restarted only the established Sensei scheduled task, retained the private-LAN binding, and passed non-mutating health, database-integrity, browser, weekly-board, History, Parent Mode entry, and live night-scene checks. It changed no schema, dependency, business logic, network, startup, authentication, or household data.

The full-calendar expected-chores correction is implemented, verified, published, and deployed. A live check confirmed the newly configured chore appears on its future November dates while the persisted week and occurrence counts remain unchanged. Deployment used a verified SQLite-native backup, required no schema migration, and restarted only the existing Sensei scheduled task.

The Living Overworld atmosphere refinement is deployed from local release commit `4dc36f1`. Verification passed 51 automated tests, client/server TypeScript checks, the production build, the isolated visual harness, and all 35 browser workflows. Deployment used a verified SQLite-native online backup, restarted only `\Sensei - Household Server`, and preserved the existing LAN address and startup configuration. Non-mutating smoke checks confirmed the current client bundle, health endpoint, seven-day checklist, 42-day calendar grid, allowance balance and monthly/lifetime fields, current weather response, unchanged key-table counts, and SQLite integrity. The local branch remains ahead of GitHub; publication was not part of this release request.

The authored autumn-night integration is published and deployed from application release commit `16438c8`. The release added dedicated responsive night masters, retained independent atmosphere layers, and constrained the vertical sun/moon apex below the transparent header. Verification passed 52 automated tests, TypeScript checks, the production build, all 35 isolated browser workflows, and live desktop/mobile checks. Deployment used a verified SQLite-native online backup, restarted only `\Sensei - Household Server`, preserved the private-LAN configuration, and confirmed a seven-day checklist, 42-day calendar, Money History totals, both night assets, a clean browser console, unchanged key-table counts, and SQLite integrity. No schema, API, accounting, authentication, dependency, port, firewall, startup, or household-record change occurred.
