# Sensei Frontend Redesign — Review Handoff

Mode: **PLAN / REVIEW ONLY — NO IMPLEMENTATION**

Review the frontend redesign proposal in this directory as a candidate direction for Sensei. The proposal contains a consolidated design specification, isolated HTML/CSS prototype, synthetic screenshots, Product Owner decisions, accessibility requirements, and bounded implementation phases.

## Review objectives

1. Compare the proposal with the current production interface and established product behavior.
2. Confirm that the continuous desktop weeksheet, mobile Today flow, compact entire-week view, Parent Review, rejected state, and collapsed History preserve existing workflows.
3. Evaluate NovaPay, Sensei Classic, and Overworld Adventure for meaningful visual differentiation without separate behavior or component systems.
4. Identify any proposal that would unintentionally change chore eligibility, approvals, allowance accounting, payments, authentication, audit history, or parent permissions.
5. Check accessibility implications including keyboard flow, focus-managed panels, status language, reduced motion, mobile touch targets, and color-independent meaning.
6. Assess how the proposal can reuse the current frontend architecture and where deliberate component extraction is warranted.

## Approved Product Owner clarifications

- Rejection explanations are normally discussed in person; a short stored note is optional and never required.
- Rejected chores display `Rejected · $0 gained`.
- Rejected chores may remain in chore history/audit context but must not create allowance-ledger entries or affect the balance.
- Detailed allowance Activity opens in a panel.
- Overworld mobile scene depth is design discretion subject to usability validation.

## Required review output

- Findings ordered by product risk and usability impact.
- Clear separation of defects, design preferences, and implementation suggestions.
- Conflicts with current behavior or data contracts.
- Accessibility and responsive-layout risks.
- A recommendation to accept, revise, or reject the proposal as an implementation baseline.

Do not modify production source, backend, database, deployment, or household data. Do not implement the proposal without separate Product Owner authorization.
