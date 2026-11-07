# Current phase closure

Closure date: November 7, 2026.

Baseline: current published and deployed `main` household release.

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
| Money History totals | Complete and verified | Current-month and lifetime earned use finalized awards/corrections; lifetime paid and available balance remain separate. |
| LAN HTTP payment compatibility | Complete and verified | Payment and correction retry keys work when `crypto.randomUUID()` is unavailable. |
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

## Release evidence

1. Clean accepted source and running deployment were identified.
2. SQLite-native backups passed `integrity_check` and key-table count comparison.
3. Previous production builds were retained as rollback artifacts.
4. Verified builds were deployed through the existing scheduled-task mechanism.
5. Only the Sensei task was restarted; ports, startup, firewall, and network binding were unchanged.
6. Health, checklist, allowance, calendar, themes, browser behavior, logs, and database integrity passed non-mutating production checks.
7. Database restoration remains separately authorized and is appropriate only with evidence of data damage.

## Deferred outside this phase

- New allowance mechanics, gamification, accounts, authentication architecture, public hosting, HTTPS/PWA changes, and unrelated theme work.
- Editing a finalized decision; later changes continue through the existing auditable correction workflow.
- Bulk reward adjustments or approval comments.
