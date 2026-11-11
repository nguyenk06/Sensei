# Planner handoff

Handoff date: November 10, 2026.

## Pending visual-review branch

`feature/living-overworld-seasons` is an unmerged, undeployed visual-development branch. Gate 1 now provides four seasonal scenes, four daylight periods, a detailed phased round moon, seven-day adjacent-season transitions, a compact 140 px mobile crop, and all six appearances from the existing cached Open-Meteo service. Motion controls remain user-facing; season, light, weather, and moon overrides require `?living-preview=1`. Gate 1 Product Owner acceptance is pending; review the evidence in [Living Overworld visual review](LIVING_OVERWORLD_VISUAL_REVIEW.md) before authorizing Gate 2.

Gate 2 has not started. Its intended bounded scope is a small, weather-aware creature population and supported habitat transitions, including the axolotl where existing art and the lake habitat are suitable. It must not change chores, allowance, authentication, or database behavior.

## Authoritative baseline

- Project: Sensei — Household Chore & Allowance Tracker.
- Local repository: `C:\Dev\Sensei`.
- Authoritative baseline: the current published `main` household release.
- Parent Review Enhancements are implemented, verified, published, and deployed.
- LAN HTTP payment/correction compatibility is implemented through a client idempotency-key fallback.
- Money History exposes current-month earned, lifetime earned, lifetime paid, and available balance from audited records.
- Overworld Night Encounters are published on `main` and deployed to the existing household installation.
- The full-calendar expected-chores checkpoint is published and deployed. It makes the month view show all expected chores without materializing future weeks.

Do not restart planning from `b32b7cc`. It is the pre-patch comparison base, not the current application baseline. Resolve the exact current release SHA with `git rev-parse HEAD` when preparing future work.

## Completed independent-review scope

- Checkbox claim/undo and chore-detail interactions are separate.
- All chore states open the shared `ChoreDetailDialog` from desktop, mobile, grace-period, and calendar surfaces.
- Pending details expose a protected Review action.
- Existing parent PIN login and seven-day sessions are reused; authorization returns to the same chore.
- Approval uses the snapshotted scheduled reward; rejection adds no earnings.
- Optional existing rejection notes remain supported.
- Successful review refreshes application projections, closes details, and returns focus to the originating row.
- Individually reviewed claims are excluded from subsequent bulk review.
- Stale bulk snapshots conflict safely.
- Calendar day and chore dialogs are sequential, preventing nested focus traps.

## Completed Parent Review Enhancements

- Individual approval defaults to the occurrence's snapshotted reward and may set a different final award for that occurrence only.
- Optional parent comments are stored for standard approvals, increased approvals, and rejections.
- Reductions require a nonempty explanation in both client and server validation.
- New and edited scheduled rewards and changed individual awards use $0.25 increments.
- Existing non-quarter historical and occurrence snapshots are preserved and remain approvable unchanged.
- Chore details show scheduled and final amounts only when they differ, plus any parent comment.
- Parent history includes approved and rejected outcomes with scheduled amount, final amount, comment, source, and later corrected historical value.
- Bulk review still applies standard snapshotted rewards and offers no adjustment controls or new approval-comment requirements.

## Architecture invariants

- No new endpoint, database migration, authentication design, or dependency was introduced. The existing individual approval request accepts backward-compatible `approvedRewardCents` and `note` fields.
- `POST /api/parent/occurrences/:id/approve` and `/reject` remain the decision boundary.
- `approval_lines.occurrence_id` and earning idempotency keys prevent duplicate credit.
- Approval-line, earning-transaction, weekly-total, and audit writes remain transactional; adjusted awards use the existing unique earning idempotency key.
- The browser interface is not the security boundary; every protected action requires a live server session.
- Money History earnings use finalized approval-line values plus audited corrections, grouped by occurrence month; pending claims and payments are excluded.
- Client-generated payment/correction idempotency keys prefer `crypto.randomUUID()`, fall back to `crypto.getRandomValues()`, and are never treated as authentication secrets.

## Overworld Night Encounters checkpoint

- Night fully replaces the ordinary sheep, pig, cow, chicken, and axolotl set with zombies, skeletons, Endermen, and chicken jockeys.
- Encounter behavior is centralized in `src/client/overworldEncounters.ts`: zombies are common, skeletons occasional, Endermen rare, and chicken jockeys very rare.
- At most three encounters coexist. Each uses randomized direction, lane, position, timing, and a finite lifetime; chicken jockeys cross faster and Endermen use a restrained two-position teleport.
- The motion preference and `prefers-reduced-motion` stop movement while retaining one static creature; hidden pages suspend the encounter system.
- All new artwork is local, original Sensei-specific material under `public/assets/overworld-v04/night-creatures/`.
- This checkpoint is presentation-only. It introduces no API, schema, data, authentication, allowance, deployment, or dependency change.

## Verification evidence

- Type checking passed.
- Seven automated test files passed with 41 tests.
- Client production build and server compilation passed in isolated QA output.
- The isolated browser workflow passed desktop and 390 px mobile verification.
- Covered flows include PIN continuation, individual approve/reject, exact retries, stale bulk snapshots, bulk coexistence, focus restoration, payments, corrections, full-month expected-chore projection, future-snapshot isolation, all three themes, deterministic night-creature selection, clean day/night transitions, finite encounter traversal, and reduced motion.
- Synthetic data and temporary SQLite databases were used for tests.

## Production status

The current `main` checkpoint is the household release, including Overworld Night Encounters. It was released through the existing scheduled-task mechanism after a SQLite-native backup and passed non-mutating health, database integrity/count, LAN binding, browser, weekly-board, History, Parent Mode entry, and live night-scene checks. Deployment-specific addresses, credentials, backup paths, launcher details, and firewall configuration remain outside repository documentation.

## Remaining planner items

1. No corrective application implementation is currently required for this phase.
2. Any future product milestone requires a new Product Owner scope; do not infer additional approval, allowance, theme, or gamification work.
3. Preserve the existing production backup and rollback practice for future releases.

## Release and rollback boundary

The normal release method is: clean-tree verification, isolated automated checks, SQLite-native backup with integrity/count comparison, production build, restart only the Sensei task, and non-mutating smoke checks.

Because this release has no migration, rollback is a code/build rollback and task restart. Decisions containing comments or adjusted amounts use pre-existing columns and remain readable by the prior release; database restoration is not normally required and should occur only after explicit authorization and a demonstrated data problem.
