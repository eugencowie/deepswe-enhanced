# Spec: Design

Sets the overall visual direction for DeepSWE enhanced. The site is a compact
tool for comparing benchmark results, with the leaderboard as its main
content. Feature specs own individual controls and behaviour; design tickets
record specific visual changes.

## Visual direction

- Keep the interface quiet and data-focused. Use neutral backgrounds, clear
  text and subtle separators so model names and results are easy to scan.
- Use purple as the site's brand accent, shared by the logo and "enhanced"
  in the title, and as the mark of an enhancement: the derived columns and
  the Subscriptions picker carry a faint purple tint (brand at 5% and 8%
  on the columns, 8% and 12% on the trigger and on the picker's popover;
  the larger column area needs the fainter wash to read as the same
  weight, while the popover matches its trigger; inside the popover, a
  hovered rung, the selected rung, the edge and the rule above the
  disclaimer are stronger brand steps, so no fill or edge inside the
  popover is grey; secondary text stays muted). Keep other colour purposeful,
  such as vendor marks and labels that distinguish access routes.
- Take inspiration from DeepSWE while giving the site its own identity. The
  logo pairs a neutral fan with a prominent purple rising curve; its detailed
  geometry belongs in [ticket 01](tickets/01-logo.md).
- Use consistent sans-serif typography, spacing and control shapes. Establish
  hierarchy through size, weight and contrast, keeping secondary details
  readable without competing with the results. The type scale is 11px
  (header qualifiers such as "est"), 12px (provenance, effort levels),
  13px, 14px (table body and controls), 15px (the masthead sentence, the route card's discount figure) and
  28px (the title).

## Layout and themes

- Keep a single-page layout: a masthead (site identity, a sentence naming
  what the page adds over DeepSWE, the source links as a provenance line, and the
  theme control), a rule, the filter toolbar, then the leaderboard. There
  is no footer; every source is named in the masthead, except
  vendor-reported scores, which each row's name cites. See
  [ticket 02](tickets/02-ledger-page-layout.md).
- Keep related controls together and the table dense enough for comparison.
  On narrow screens, let controls wrap and the table scroll horizontally,
  and tighten the page padding (16px sides, 24px top and bottom, against
  24px and 32px from the sm breakpoint up).
- Let the table carry one visual encoding: Pass@1 drawn as a neutral grey
  bar behind the figure on a fixed 0 to 100% scale, the figure in medium
  weight so it stays legible over the bar. Purple is reserved for
  enhancements: the three derived columns, the Subscriptions picker
  (trigger and popover), and vendor-reported rows with their Models
  picker items, the vendor-reported toggle when on, and the source link
  in their popover.
  Other columns stay plain figures. The sorted column header is the only
  header in the foreground colour.
- Mark estimated columns with a small muted "est" after the header name.
  It stays muted when the column is sorted; only the name turns to the
  foreground colour. Time is estimated; Tok/s is a measurement and
  carries no mark.
- Underlines encode what a click does: solid for links (the provenance
  line and a vendor-reported row's source), dotted for text that opens a tooltip or popover: the column
  headers and vendor-reported model names.
- The effort level after a model name has both a real space (so the
  accessible name and copied text read naturally) and a visual margin.
  Neither replaces the other.
- Support light and dark appearances throughout. Neutral colours and the
  purple accent adapt to the theme while preserving the same hierarchy.
  Theme behaviour is covered by the [dark-mode spec](../dark-mode/spec.md).
- Preserve readable contrast, visible keyboard focus and accessible control
  names. Colour supports meaning alongside text, icons or control state.

## Acceptance criteria

- The leaderboard remains the main visual focus at desktop and mobile sizes.
- Branding, typography and controls are consistent across the page.
- Both themes keep content and interactive states legible.
- Narrow layouts keep controls usable and table content accessible.

## Tickets

- [01: Site logo and favicon](tickets/01-logo.md)
- [02: Ledger page layout](tickets/02-ledger-page-layout.md)
