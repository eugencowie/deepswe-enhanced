# 09: Toolbar splits into a Subscriptions picker and a Models picker

Type: task
Status: resolved
Blocked by: none (can start immediately)

## What to build

The toolbar builds the Subscriptions picker's trigger (tier picks, accessible name, vendor marks) while the route card owns only its popover, and the Models menu is written inline. Give each picker (docs/glossary.md) one component that owns its menu, trigger and content. The toolbar then composes the version chip, the effort buttons and the two pickers and nothing else.

The two formatters used only by the route card (tier discount, monthly price) move into the Subscriptions picker with their tests, and the standalone format module is deleted, as ADR 0007 anticipated.

Markup, accessible names and behaviour are unchanged.

## Acceptance criteria

- [x] A Subscriptions picker component owns the trigger, its accessible name and the route card; a Models picker component owns the checkbox list and its select-all and clear items.
- [x] The toolbar contains no picker-specific logic.
- [x] The standalone format module is gone; its tests live beside the Subscriptions picker.
- [x] All e2e filter and theme tests pass unchanged; `vp check` and `vp test` are green.

## Decisions (grilled 2026-09-11)

- Layout: `subscriptions-picker.tsx` and `models-picker.tsx` under `src/components/`; `route-card.tsx` is deleted and `RouteCard` becomes a private function of the Subscriptions picker, keeping its glossary name.
- Interface: each picker takes `filters`, `onChange` and its option list, and calls the filter transitions (`setRoute`, `toggleModel`, `setModels`) itself. The toolbar's props and App are unchanged.
- Formatters: `formatTierDiscount` and `formatUsdPerMonth` are exported from the Subscriptions picker module and their tests move verbatim to `subscriptions-picker.test.ts`.
- Effort buttons: stay inline in the toolbar, as "What to build" lists them. The glossary calls them a picker, so the second criterion is read as "no Subscriptions- or Models-specific logic"; a component would be a one-caller wrapper around eight lines.
- Glossary: **Models picker** added as the internal name, with "Models menu" as the UI copy, parallel to Subscriptions picker.
- No new rendering tests (the e2e filter tests already assert every accessible name); no ADR (reversible, unsurprising); ADR 0007 untouched, its "until the Subscriptions picker is deepened" is now met.

## Answer

The toolbar composes the version chip, the effort buttons, `SubscriptionsPicker` and `ModelsPicker`. The Subscriptions picker owns its menu root, the brand-tinted trigger with its tier picks and accessible name, and the route card; the Models picker owns its menu root, the counted trigger, the checkbox list and the select-all and clear items. `route-card.tsx` and `src/data/format.ts` are gone.

One deviation from the plan: the repo's `react/only-export-components` rule (warn, app components only) fires on the two exported formatters. Testing them privately through rendered markup, as ADR 0007 does for the columns, is not possible: base-ui's menu popup is a portal and renders nothing under react-dom/server even with the root open, and the repo has no DOM test environment. The two exports carry a `oxlint-disable-next-line` with the reason; these are the repo's first suppressions.

Validation: `vp check` passes with no warnings; `vp test` passes all 168 tests across 11 files; `mise run e2e` passes all 11 browser tests unchanged.
