# Current phase closure

Closure candidate date: November 7, 2026.

Baseline: published `main` commit `1532c3b`. Implementation branch: `feature/parent-review-enhancements`; publication and household deployment remain separately gated.

## Requirement checklist

| Current-phase item | Status | Evidence |
| --- | --- | --- |
| Chore-first redesign | Complete and verified | Desktop weeksheet and mobile Today/week overview pass browser QA. |
| Independent chore details | Complete and verified | Shared details work from weeksheet, grace period, mobile, and calendar. |
| Individual approval/rejection | Complete and verified | Protected occurrence endpoints and browser workflow pass. |
| Parent PIN continuation | Complete and verified | Selected chore survives authorization; focus returns to its opener. |
| Bulk review coexistence | Complete and verified | Individually decided claims leave pending review; stale snapshots conflict. |
| Accounting safeguards | Complete and verified | Unique occurrence decision, earning idempotency key, and transactional writes remain intact. |
| Optional parent comments | Complete and verified | Standard/increased approvals and rejections persist optional comments. |
| Individual reward adjustments | Complete and verified | Final award affects only one occurrence; scheduled snapshot is unchanged. |
| Required reduction explanations | Complete and verified | Client and server block reductions without a nonempty explanation. |
| Quarter-dollar validation | Complete and verified | Client/server validate new/edited schedules and changed awards; legacy values remain exact. |
| Child-visible award details | Complete and verified | Adjusted chore details show scheduled/final amounts and comments. |
| Historical review details | Complete and verified | Expandable history shows outcome, amounts, comment, source, and corrected value. |
| Mobile and desktop behavior | Complete and verified | Isolated browser QA passes desktop and 390 px mobile checks without overflow. |
| Accessibility | Complete and verified | Dialog focus containment/restoration, keyboard use, labels, status alerts, and reduced motion pass. |
| Documentation consistency | Complete and verified | README and core planning, architecture, development, and state documents updated. |

No approved current-phase item is blocked. Unrelated roadmap ideas remain deferred and require a new Product Owner scope.

## Storage and API compatibility

No schema migration is required. Existing `approval_lines.original_reward_cents`, `approved_reward_cents`, and `note` columns already represent the scheduled snapshot, final award, and parent comment. The individual approve request adds optional `approvedRewardCents` and reuses `note`; calls omitting both retain standard behavior. Checklist and calendar responses expose the existing final award for display.

Historical rows and balances are not recalculated, rounded, or rewritten. Representative legacy non-quarter occurrence values are covered by automated compatibility testing and remain approvable unchanged.

## Verification

- `pnpm typecheck`: passed.
- `pnpm test`: 6 files, 37 tests passed.
- Isolated Vite production client build: passed.
- Isolated TypeScript server build: passed.
- `pnpm qa:browser` against a temporary SQLite database and isolated build: passed.
- Desktop and 390 px mobile screenshots were captured under ignored `.qa/` output.

## Release plan

1. Confirm a clean accepted commit and the actual running deployment revision.
2. Create a SQLite-native online backup; run `PRAGMA integrity_check` and compare key table counts.
3. Record current configuration and rollback commit (`1532c3b`).
4. Build the accepted commit using the existing deployment mechanism.
5. Restart only the Sensei task; do not change ports, startup, firewall, or network binding.
6. Perform non-mutating checks: health, checklist, allowance totals, Parent Mode entry, calendar/history, and all themes.
7. If code rollback is needed, redeploy `1532c3b` and restart. Restore the database only with separate authorization and evidence of data damage.

## Deferred outside this phase

- New allowance mechanics, gamification, accounts, authentication architecture, public hosting, HTTPS/PWA changes, and unrelated theme work.
- Editing a finalized decision; later changes continue through the existing auditable correction workflow.
- Bulk reward adjustments or approval comments.
