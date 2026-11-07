# 02: Route-card Subscriptions picker

Type: prototype
Status: resolved
Blocked by: 01

## Question

What should the Subscriptions picker look like? Ticket 01's menu was a stock dropdown: two labelled radio sections stacked, a check mark on the right, and the discount and Fable badges crowded onto the same edge. The trigger only named the picks as a text suffix.

## Prototype

Four variants on the one route, switched by `?variant=` and a floating bar, inside the real toolbar above the real table. The variant code was discarded once the verdict was in; the descriptions below are the record.

- A, inline route rows: a second toolbar line with one segmented control per family, no menu.
- B, one trigger per vendor: two brand-tinted triggers, each opening a short list with price and discount.
- C, route card: one trigger, a popover of two side-by-side price ladders, the discount as the loud figure on each rung.
- D, a sentence: "Priced as if you're on Claude [API] and ChatGPT [API]" with inline pills.

## Answer

C, grilled 2026-09-07 with three changes from the prototype:

- The rung's right side shows the percentage discount ("−95%", semibold at 15px, the largest step in the type scale below the title) with "Fable: −90%" beneath in small muted text, instead of the prototype's cents per API dollar. The Fable footnote paragraph goes; the rung carries the note.
- The trigger reads plain "Subscriptions" while both families are on the API. Otherwise it shows only the tier picks, each with its vendor mark, and an explicit label keeps the accessible name stable ("Subscriptions: Anthropic Max 5x, OpenAI Plus") for screen readers and the e2e tests.
- Below the `sm` breakpoint the columns stack, and the popover width is capped to the viewport.

Kept from the prototype: monthly price under each tier label, the "full price" caption on the API rung, brand fill for the selected rung with no check mark, and the estimate disclaimer under a separator.

Review follow-ups, same day: "plan" is a glossary-avoided word, so the card is a route card (added to docs/glossary.md) and the rung component is `RouteRung`; the discount figure dropped from 16px to 15px to stay on the documented type scale; the column's vendor mark now comes from `PickerFamily.vendor`, derived from the mapping, instead of a hardcoded map; the monthly price goes through `formatUsdPerMonth`.

## Acceptance criteria

- [x] The popover shows Claude and ChatGPT as side-by-side columns with vendor marks, monthly prices, tier discounts and Fable notes, all derived from `tiers.json` and the mapping.
- [x] The trigger reads "Subscriptions" on defaults and shows only tier picks with vendor marks otherwise; its accessible name always starts with "Subscriptions".
- [x] `vp run ready` and the Playwright filters suite pass with the updated trigger and rung assertions.

## Comments

Implemented 2026-09-07. `PickerTier` gained `priceUsdPerMonth`. The toolbar's menu uses
`DropdownMenuRadioGroup` per column with a local `RouteRung` on Base UI's `Menu.RadioItem`,
styled with a brand fill (`data-checked:bg-brand/15`, 20% in dark) in place of the vendored item's check indicator. The
popover is `w-[min(30rem,var(--available-width))]` with `sm:grid-cols-2`. The e2e trigger
assertions changed from "Subscriptions: Max 5x · Plus" to
"Subscriptions: Anthropic Max 5x OpenAI Plus" (comma added in the third review).

Grilled again 2026-09-08 over the review: the discount figure stays at 15px and the
design spec's scale line is unchanged; the selected rung's price and Fable lines stay muted;
the rung keeps its direct Base UI radio item; the extra e2e assertion (no Fable note on
ChatGPT rungs) stays. The popover gained the brand wash with a brand 20% ring; after trying the
pairs by hand the trigger's 8%/12% won over the columns' 5%/8% and a fainter 3%/5%, and a hovered or focused rung takes a faint brand
fill rather than the menu's grey accent so nothing inside the card is grey. The design spec's purple line now names the Subscriptions picker, trigger
and popover, and docs/glossary.md distinguishes a filter (a feature and its state) from a
picker (the control that sets it) rather than renaming either. Verification: the dev build
was checked by hand in place of a deploy check; the Playwright suite passes against the
production build.

Review follow-ups 2026-09-08, second round: the brand 20% ring now applies in dark mode too
(the vendored popover's dark ring override had survived the class merge) and the rule above
the disclaimer takes the same tint; the card, its rung and its wash moved to
`src/components/route-card.tsx`; the rung no longer accepts a className; the build fails
when a subscription family has no mapping entry instead of silently dropping the vendor mark; the design spec's "nothing is grey" is scoped to fills and edges.

Third review 2026-09-08: the family-vendor invariant moved to `src/data/schema.ts` as
`assertFamilyVendors` (ADR 0004), which also rejects a family whose entries span two vendors;
the leaderboard test fixture no longer carries unused per-family entries; the trigger with picks
carries an explicit label ("Subscriptions: Anthropic Max 5x, OpenAI Plus"), since a hidden
separator in name-from-content gets space-padded; `formatUsdPerMonth` prints the published
price without rounding; the design spec's scale line names the discount figure's 15px.
