# Sensei Frontend Redesign Prototype

This package is an isolated, static design proposal. It is not connected to the Sensei API, database, authentication, or household records. All displayed chores, dates, decisions, and money values are synthetic. Inclusion in the Sensei repository is for review only and is not production implementation authorization.

## Preview

Open `index.html` in a browser. The yellow prototype bar switches between themes and review states. Query parameters can open a specific state directly:

```text
index.html?theme=novapay&view=desktop
index.html?theme=classic&view=week
index.html?theme=overworld&view=today
index.html?theme=novapay&view=review
index.html?theme=novapay&view=review-complete
index.html?theme=classic&view=states
index.html?theme=novapay&view=history-expanded
index.html?theme=novapay&view=activity-panel
```

Supported themes are `novapay`, `classic`, and `overworld`. Supported views are `desktop`, `today`, `week`, `review`, `review-complete`, `states`, `history-collapsed`, `history-expanded`, and `activity-panel`.

## Contents

- `DESIGN_SPEC.md` — consolidated design specification, skill critique, implementation boundaries, and open decisions.
- `index.html`, `styles.css`, `app.js` — isolated interactive prototype.
- `assets/summer.webp` — a copy of the existing Sensei summer landscape used only in this prototype.
- `screenshots/` — rendered review captures at desktop and mobile sizes.

## Prototype limitations

- Chore actions and approval controls are illustrative and do not save.
- Parent authorization is not simulated.
- Motion treatments are specified but represented as static end states.
- The calendar does not navigate.
- The Overworld example uses one summer/day scene; production seasonal, lighting, weather, and animal behavior would remain supplied by the existing scene system.
- This prototype does not establish final copy, fonts, or implementation architecture.

The proposal does not modify application components, server behavior, database structures, deployment configuration, or household data.
