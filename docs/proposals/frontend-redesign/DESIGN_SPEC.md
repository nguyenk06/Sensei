# Sensei Frontend Redesign Specification

Status: **Design prototype for Product Owner review — not an implementation authorization**

This document separates approved behavior, prototype recommendations, and unresolved decisions. It preserves Sensei's existing chore, allowance, approval, payment, authentication, historical, and theme behavior.

## 1. Design intent

Sensei should feel like a household weeksheet, not a financial dashboard. The child should reach today's chores immediately. Money should motivate and explain outcomes without displacing the checklist. Parent review should feel like a trusted state of the same product, while configuration and financial maintenance remain appropriately separate.

The primary visual object is one continuous Monday–Sunday board. Themes change its material and atmosphere, not its behavior.

## 2. Approved behavior

The following are Product Owner-approved and treated as constraints:

1. The weekly chore board is the primary experience.
2. Desktop displays one continuous seven-day weeksheet.
3. Mobile opens on Today and provides a seven-day navigation rail.
4. View Entire Week displays seven compact summaries; selecting a day opens its checklist.
5. Empty days remain visible but quieter.
6. Completed chores remain visible in compact rows.
7. Claim feedback is brief, satisfying, theme-specific, and reduced-motion compatible.
8. Rejected claims use a clear, neutral treatment and expose an available explanation.
9. The heading contains Claimed This Week and Available Balance without conflating them.
10. Pending approvals provide a contextual Review entry.
11. Parent Review reuses existing authorization and approval safeguards.
12. A completed review ends with a summary and Done action.
13. History is collapsed beneath the weeksheet by default.
14. Expanded History shows the calendar first; detailed Activity is available on demand.
15. NovaPay, Classic, and Overworld share behavior while retaining distinct identities.
16. Overworld keeps its scenery, seasons, weather, animals, motion control, and accessibility preferences.

## 3. Information architecture

### Global header

- Left: Sensei identity.
- Far right: device-local Theme selector, then Parent Mode.
- Avoid a permanent service-status chip unless the application is degraded or requires action.
- In Overworld, the header may overlay the upper sky with a contrast scrim.

### Weeksheet heading

- Eyebrow: `THIS WEEK`.
- Date range is the primary heading.
- Optional short household-language supporting line.
- Financial ribbon contains exactly two concepts:
  - **Claimed this week** — completed claims awaiting or including review according to the existing API definition.
  - **Available balance** — approved and unpaid money.
- Each amount includes a plain-language qualifier. Color alone must not distinguish the concepts.

### Desktop weeksheet

- Seven equal day columns within one bordered surface.
- Days are separated by rules, not seven floating cards.
- Today's date header has the strongest emphasis.
- A day column contains compact chore rows and a concise footer summary.
- Empty days keep their date and use `Nothing scheduled` or equivalent neutral language.
- Future chores remain visible but disabled and visually subdued.
- Chore rewards align consistently at the trailing edge.

### Mobile Today

- Always opens on the household's current date rather than preserving a previously selected day.
- Seven-day rail remains visible above the selected day's checklist.
- Each rail item includes weekday, date, and a small redundant state cue.
- The active day is indicated with shape, contrast, and `aria-current`, not color alone.
- Today's full checklist uses large touch targets and keeps reward amounts aligned.
- `View entire week` is an explicit button; the interface must not depend on horizontal swiping.

### Mobile entire week

- Seven compact summary rows remain in Monday–Sunday order.
- Each row shows completion count and its most important outcome or opportunity.
- Empty days are present at reduced emphasis.
- Selecting a row opens the corresponding checklist.
- The summary screen is a temporary view; normal entry still opens Today.

## 4. Chore and day states

### Ready

- Empty checkbox with a text label and reward.
- Avoid a separate `Ready` chip unless ambiguity exists.

### Claimed / pending review

- Checked control with an amber or theme-equivalent treatment.
- Supporting copy: `Waiting for review`.
- Undo remains available only when existing business rules allow it.

### Approved / completed

- Compact, slightly subdued row that remains readable.
- Supporting copy: `Approved` or the existing approved timestamp when useful.
- Never remove the row after completion; disappearance makes the week harder to understand.

### Rejected

- Neutral gray treatment with an `×` or equivalent text-supported marker.
- Use `Rejected · $0 gained` as the concise outcome.
- Do not collect or display a written rejection note. The reason is discussed in person.
- A rejected claim remains part of chore history and the approval audit context, but creates no allowance-ledger entry and has no balance effect.

### Future / locked

- Visible with reduced contrast.
- Disabled control and plain availability copy.
- Do not rely on a lock icon alone.

### Claim feedback

Suggested motion budget: 150–260 ms.

- NovaPay: a precise check stroke and short cyan-to-lime confirmation pulse.
- Classic: a subtle pressed-paper movement and inked check appearance.
- Overworld: a small emerald glint or one-block bounce localized to the claimed row.
- Reduced motion: immediate state change with a brief color/border emphasis only.
- Server success remains the trigger. Animation never predicts or delays the authoritative result.

## 5. Parent Review

- Review entry appears contextually when the authorized parent has pending claims.
- Review is a focused layer over the weeksheet, not a replacement administrative application.
- Each row shows chore, date, snapshotted reward, selection state, and reject action.
- Bulk approval preserves the existing exact-snapshot safeguards.
- Rejecting an item must remain visually distinct from merely deselecting it.
- Completion state summarizes approved count and amount plus rejected count, followed by one `Done` action.
- Parent chore configuration, payments, corrections, export, and sign-out remain in Parent Mode rather than moving into the review layer.

## 6. History

### Collapsed state

- One summary row directly beneath the weeksheet.
- Suggested content: current month, approved total, missed count, and payment count.
- The entire row is a disclosure control with accurate `aria-expanded` state.

### Expanded state

- Calendar appears first.
- Preserve the existing high-impact approved, pending, and missed markers.
- Detailed Activity opens in a focused panel rather than remaining below the calendar.
- The Activity panel contains only balance-affecting earnings, corrections, and payments. Rejected claims do not appear as zero-value balance-sheet entries.
- Calendar date details reuse existing claim, review, and historical eligibility rules.

## 7. Theme system

All themes use the same semantic component structure and state vocabulary. Theme code supplies material, typography, spacing accents, borders, and motion personality.

### NovaPay — precise household ledger

- Deep blue-black surfaces and fine cyan rules.
- Compact, highly aligned numeric typography.
- Minimal rounding and fewer floating shadows.
- Lime reserved for approved money and decisive actions.
- Personality comes from precision and rhythm, not generic glowing KPI tiles.

### Sensei Classic — household wall planner

- Warm paper ground with a restrained ruled grid.
- Evergreen structure and clay action accent.
- Flatter surfaces, visible sheet edges, and minimal elevation.
- Serif headings are acceptable when paired with practical, non-editorial composition.
- Avoid stacking cream cards or using texture behind small chore text.

### Overworld Adventure — integrated scenic weeksheet

- Preserve the current environmental scene system.
- The weeksheet overlaps the lower terrain edge so scenery and task board read as one composition.
- Oak/brown outer frame, grass top edge, square controls, and emerald financial accents.
- Weather, animals, lighting, and scenery remain decorative and behind controls.
- Do not encode chore status solely through environmental changes.
- Mobile scene is shallower than the current long scenic header but retains identifiable landscape landmarks.

## 8. Frontend skill review

### Anthropic Frontend Design

Applicable findings:

- The interface needs one characteristic central object. The weeksheet supplies that identity more effectively than a large title plus three KPI cards.
- Typography and layout should carry theme identity, not only palette tokens.
- Boldness should be concentrated. Overworld spends it on the landscape; NovaPay on ledger precision; Classic on the wall-planner sheet.
- Motion should attach to meaningful actions rather than ambient UI transitions.
- Repeated rounded cards, tracked all-caps labels, generic KPI blocks, and the cream/serif/clay pattern can become recognizable AI-design defaults.

Resulting refinements:

- Seven day cards became one continuous object.
- Three KPI cards became a two-concept financial ribbon.
- Classic uses ruled planner structure instead of a stack of cream cards.
- Overworld integrates the board with existing terrain rather than adding more decorative panels.
- Eyebrows are limited to major orientation points, not every label.

Conflict assessment: no material conflict with approved decisions. Anthropic's preference for strong originality could encourage more experimental composition, but the approved shared behavior and household clarity appropriately limit that experimentation.

### Vercel Web Interface Guidelines

Applicable findings:

- Use semantic controls, visible focus, explicit labels, `aria-current`, and accurate disclosure state.
- Keep touch targets practical and avoid gesture-only navigation.
- Respect reduced motion and animate transforms/opacity rather than layout.
- Prevent horizontal overflow and handle long labels and amounts.
- Use tabular number alignment for money.
- Dialogs require Escape handling, focus containment, and focus restoration.
- Forms should provide names, labels, input modes, and appropriate autocomplete metadata.
- Async success and error feedback must be announced without obscuring values.

Resulting refinements:

- The mobile week rail is button-based and retains a View Entire Week path.
- Financial meanings have visible labels and explanatory text.
- History is a semantic disclosure concept.
- Proposed Parent Review is specified as a focus-managed layer.
- Responsive prototypes were tested at an exact 390-pixel viewport with zero horizontal overflow.

Potential conflict: Vercel recommends URL-reflected state for meaningful navigation. For a private single-page household tool, putting selected day, history expansion, and review state in the URL adds complexity with little routine value. It should be deferred unless back-navigation or refresh behavior proves confusing.

## 9. Accessibility requirements

- One `h1` describing the active week; logical heading order beneath it.
- Skip link before the global header.
- Minimum practical touch target of approximately 44 CSS pixels for primary mobile actions.
- Every icon-only action has an accessible name.
- `aria-current="date"` for today and an explicit selected state for other chosen days.
- Status communicated by copy and symbol as well as color.
- Financial values use tabular numerals and retain full precision from server data.
- Review and date-detail dialogs trap focus, close with Escape, and return focus to their opener.
- Claim success uses a polite live region; errors use an assertive, actionable announcement where appropriate.
- Reduced-motion preference removes bounce, glint movement, and crossfades while preserving immediate state visibility.
- Decorative Overworld layers remain `aria-hidden` and noninteractive.
- Contrast must be checked for every seasonal/light combination, not only the summer/day prototype.

## 10. Reuse and implementation implications

### Reuse without behavioral changes

- Existing checklist, calendar, allowance, approval, payment, and theme APIs.
- Existing occurrence snapshots and server-derived eligibility.
- Existing `CalendarSection` outcome data and day-detail behavior.
- Existing Overworld scene component, assets, weather cache, seasonal blending, and motion preference.
- Existing device-local theme preference.

### Component-level restructuring

- Extract a `WeekSheet` from the current application component.
- Add shared `WeekHeading`, `AllowanceRibbon`, `DayRail`, `DayColumn`, `ChoreRow`, and `WeekSummary` components.
- Convert Calendar and Activity into a `HistoryDisclosure` with the calendar as its first view.
- Add a focused `ParentReview` flow using existing approval endpoints and snapshot validation.
- Keep parent configuration and allowance maintenance in the existing protected panel.

### No architectural need identified

The design does not require a new state library, animation package, routing system, backend service, database migration, or separate component tree per theme.

## 11. Recommended bounded implementation phases

These are planning recommendations, not execution authorization.

### Phase A — Shared weeksheet foundation

- Extract presentation components without changing API calls or mutations.
- Implement desktop continuous sheet, mobile Today, day rail, entire-week summaries, empty/future/completed states, and financial ribbon.
- Keep existing calendar and Parent Mode temporarily intact.
- Verify parity with existing claim/undo and date eligibility behavior.

### Phase B — Review and history hierarchy

- Add contextual Review entry and focused review layer using existing authorization and approval safeguards.
- Add completion summary and Done.
- Collapse History by default; show calendar first and Activity on demand.
- Add dialog focus management and keyboard verification.

### Phase C — Theme differentiation

- Apply NovaPay ledger, Classic planner, and Overworld integrated-scene treatments through semantic theme classes/tokens.
- Add bounded theme-specific claim feedback and reduced-motion equivalents.
- Test Overworld across seasons, four lighting periods, weather appearances, and narrow viewports.

### Phase D — Validation and polish

- Visual regression captures for three themes and required states.
- Keyboard, screen-reader semantics, reduced-motion, long-copy, empty-state, and narrow-width checks.
- Confirm no backend, financial, historical, or authorization behavior changed.

## 12. Product Owner decision record

Approved during prototype review:

1. Rejection reasons are discussed in person. Sensei does not need a stored parent note or written explanation.
2. Rejected chores display `Rejected · $0 gained`.
3. Detailed allowance Activity opens in a panel.
4. Rejected claims remain available in chore history/audit context but do not appear as balance-sheet entries and never affect the allowance balance.

Design discretion pending visual validation:

- The prototype retains an approximately 220 CSS-pixel Overworld mobile scene. The Product Owner expressed no preference, so implementation should validate it against Today visibility and adjust within a compact range without requiring a new product decision.

No additional product decision is currently required for the prototype. Final copy and exact spacing remain design-polish matters unless they change the meanings above.

## 13. Prototype limitations

- Static synthetic data; controls do not mutate state or call an API.
- Parent authorization and stale-snapshot safeguards are described, not simulated.
- The prototype shows motion end states, not final animations.
- Only summer/day Overworld artwork appears; existing production systems would continue to provide other seasons, lighting, weather, and animals.
- Typeface choices use installed system families and are directional rather than final.
- Screenshots demonstrate layout, hierarchy, density, and theme material—not production readiness.
