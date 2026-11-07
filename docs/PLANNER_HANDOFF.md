# Planner handoff

Handoff date: November 7, 2026.

## Authoritative baseline

- Project: Sensei — Household Chore & Allowance Tracker.
- Local repository: `C:\Dev\Sensei`.
- Current release: the combined Independent Chore Review checkpoint at the tip of `main`.
- Local `main` and `feature/independent-chore-review` are aligned to that combined checkpoint.
- Pre-release comparison base: `b32b7cc`.
- Working tree was clean at release verification.

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

## Architecture invariants

- No new backend endpoint, database migration, authentication design, accounting rule, or dependency was introduced.
- `POST /api/parent/occurrences/:id/approve` and `/reject` remain the decision boundary.
- `approval_lines.occurrence_id` and earning idempotency keys prevent duplicate credit.
- Approval-line, earning-transaction, weekly-total, and audit writes remain transactional.
- The browser interface is not the security boundary; every protected action requires a live server session.

## Verification evidence

- Type checking passed.
- Six automated test files passed with 33 tests.
- Client production build and server compilation passed in isolated QA output.
- The isolated browser workflow passed desktop and 390 px mobile verification.
- Covered flows include PIN continuation, individual approve/reject, exact retries, stale bulk snapshots, bulk coexistence, focus restoration, payments, corrections, calendar, all three themes, and reduced motion.
- Synthetic data and temporary SQLite databases were used for tests.

## Production status

The runtime changes represented by this combined checkpoint were built and restarted through the existing household startup mechanism after a SQLite-native online backup passed `integrity_check`. Post-release health checks confirmed the expected client asset, private-LAN service availability, database integrity, and no recent server errors.

Deployment-specific addresses, local credentials, backup paths, launcher details, and firewall configuration remain outside repository documentation.

## Remaining planner items

1. Publication is the only immediate repository-state decision: authorize or defer pushing local `main` to GitHub.
2. No corrective implementation is currently required for Independent Chore Review.
3. Any future product milestone requires a new Product Owner scope; do not infer additional approval, allowance, theme, or gamification work from this handoff.
4. Preserve the existing production backup and rollback practice for future releases.

## Release and rollback boundary

The normal release method is: clean-tree verification, isolated automated checks, SQLite-native backup with integrity/count comparison, production build, restart only the Sensei task, and non-mutating smoke checks.

Because this patch has no migration, rollback is a code revert to the previous release, rebuild, and task restart. Database restoration is not normally required and should occur only after explicit Product Owner authorization and a demonstrated data problem.
