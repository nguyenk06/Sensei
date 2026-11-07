# Planner handoff

Handoff date: November 7, 2026.

## Authoritative baseline

- Project: Sensei — Household Chore & Allowance Tracker.
- Local repository: `C:\Dev\Sensei`.
- Published baseline: `main` at `1532c3b` (`feat: add independent chore review workflow`).
- Current candidate was developed on `feature/parent-review-enhancements` from that published baseline and is intended to be merged locally only after every verification gate passes.
- GitHub publication of the Independent Chore Review baseline is complete; the former publication decision is no longer open.
- Parent Review Enhancements are implemented and verified locally but are not published or deployed.

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

## Verification evidence

- Type checking passed.
- Six automated test files passed with 37 tests.
- Client production build and server compilation passed in isolated QA output.
- The isolated browser workflow passed desktop and 390 px mobile verification.
- Covered flows include PIN continuation, individual approve/reject, exact retries, stale bulk snapshots, bulk coexistence, focus restoration, payments, corrections, calendar, all three themes, and reduced motion.
- Synthetic data and temporary SQLite databases were used for tests.

## Production status

The published Independent Chore Review baseline remains the household release. Parent Review Enhancements have not been pushed, deployed, restarted, or applied to the household database. Deployment-specific addresses, credentials, backup paths, launcher details, and firewall configuration remain outside repository documentation.

## Remaining planner items

1. Product Owner visual/functional acceptance of the Parent Review Enhancements candidate.
2. Separate authorization to publish and deploy the accepted candidate.
3. Any future product milestone requires a new Product Owner scope; do not infer additional approval, allowance, theme, or gamification work.
4. Preserve the existing production backup and rollback practice for release.

## Release and rollback boundary

The normal release method is: clean-tree verification, isolated automated checks, SQLite-native backup with integrity/count comparison, production build, restart only the Sensei task, and non-mutating smoke checks.

Because this candidate has no migration, rollback is a code rollback to `1532c3b`, rebuild, and task restart. Decisions made after release may contain comments or adjusted amounts in already-existing columns and remain readable by the prior release; database restoration is not normally required and should occur only after explicit authorization and a demonstrated data problem.
