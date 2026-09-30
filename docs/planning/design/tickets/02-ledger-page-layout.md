# 02: Ledger page layout

Type: prototype
Status: resolved

## Question

What should the page look like so a first-time visitor sees the ranking,
the cost story, and the subscription angle without opening a dropdown?

## Prototype

Three full-page variants on the existing route, switched by `?variant=`
in dev builds only. Branch `prototype/page-design-options`, commit
`c171682`; the design plan and the review against generic defaults are in
`src/prototype/README.md` on that branch.

- A, Ledger. Single column. A masthead with a one-sentence description
  and the source links folded into it. A rank column. Pass@1 drawn as a
  purple bar behind the figure.
- B, Sidebar. The filter form always visible on the left with tier
  discounts beside each radio; Pass@1 and cost per solved task in a
  heavier weight in the table.
- C, Chart-led. A scatter of cost per solved task against Pass@1 with the
  Pareto front in purple, above a compact table.

## Answer

A, Ledger. Chosen by the user on 2026-09-06 after flipping through all
three in light and dark mode.

## What changed in main

- The header is a masthead: 28px title with a 40px mark, a sentence
  naming what the page adds over DeepSWE, and the three source links as
  a provenance line beneath it. The footer is gone. (Both lines were
  reworded on 2026-09-07; see the comments.)
- The toolbar sits on a rule directly above the table.
- Pass@1 draws a bar behind the figure on a fixed 0 to 100% scale. Purple
  in the prototype, neutral grey after the follow-up below.
  It is the only column with a bar; every other column is an open scale.
- Effort levels lose their square brackets: "Claude Fable 5 xhigh" in a
  small muted weight. A real space precedes the word so copied text and
  the accessible name stay readable.
- Column headers shorten to Cost, Tokens, Cost/perf, Time, Tok/s. Time
  carries a small muted "est" after the name instead of the old "(est)";
  Tok/s carried one too until 2026-09-07 (see the comments). The derived columns keep their tooltips and the separating
  rule. The prototype's "$/solved" was tried and reverted to "Cost/perf",
  which reads as benchmark vocabulary to this audience; the tooltip
  carries the definition.
- Unsorted column headers are muted; the sorted one is in the foreground.

## Acceptance criteria

- [x] Masthead, provenance line and rule above the toolbar
- [x] Pass@1 bar in both themes
- [x] Effort level without brackets, accessible name keeps its space
- [x] `vp run ready` and the e2e task pass

## Comments

**2026-09-06**. Prototyped and folded in. The prototype's own code was not
promoted; the table component gained an optional `bar` on its column spec
and App.tsx gained the masthead. The e2e filter tests
were updated for the new cell names and the "Cost" header. Verified light
and dark with Playwright screenshots.

**2026-09-06**. Rank column removed at the user's request after seeing it
in the real page. The prototype branch still has it.

**2026-09-06**. Follow-ups in the same session: the Subscriptions trigger
and the three derived columns carry a faint brand tint, marking what the
site adds over DeepSWE. The Pass@1 bar became neutral grey so purple means
"enhanced" and nothing else.

**2026-09-06**. Code review follow-up, decided with the user: headers are
Cost, Tokens, Cost/perf, Time est, Tok/s est. The provenance line drops
the benchmark version (the v1.1 chip has it). The Pass@1 figure stays
medium weight over the bar. The effort word keeps both a real space and a
margin. "est" stays muted on a sorted column. The derived-column tint is
fainter than the trigger's on purpose. The glossary gained "Enhancement"
for what purple marks. The column spec's `qualifier` string became an
`estimate` flag and `bar` a flag that reuses the column's value.

**2026-09-07**. Masthead sentence rewritten after a grilling session. It
now names what the page adds over DeepSWE, in column order: "DeepSWE's
coding-agent leaderboard, plus what it doesn't report: cost per solved
task, time at the consumer API throughput, and the effective cost on a
Claude or ChatGPT subscription." The grilling agreed "the vendor's
consumer API throughput" and "the cost"; the user trimmed the first and
switched the second to the glossary term before committing. Decisions: state what is added rather
than what is compared, so the sentence and the purple columns say the
same thing; name the throughput as the consumer API's rather than "real",
which the Tok/s tooltip contradicted; describe the subscription cost
rather than instruct the reader to open the picker; keep "coding-agent"
as the only gloss on DeepSWE; hold to two lines at desktop, which forced
noun items over the prose "what each solved task costs". The shipped
sentence measures two lines at 1100px. Follow-up: the provenance line is next; the user's sketch
is "Sources: DeepSWE (2026-09-03), OpenRouter (2026-09-05), SemiAnalysis."

**2026-09-07**. Provenance line shortened after a second grilling:
"Sources: DeepSWE (2026-09-03), OpenRouter (2026-09-05), SemiAnalysis
(2026-06-10)." Names stay linked, dates sit outside the links. Decisions:
the line does attribution and freshness only; the "rough estimates" caveat
moved out because the Subscriptions picker already says it at the moment
tier costs appear, and the default view is API-only. Each date is the
upstream figure's own age: DeepSWE's artifact generation time, OpenRouter's
capture time, and the SemiAnalysis post's date, decoded from the tweet id
and stored as `publishedAt` in tiers.json (the transcription date stays in
the source string). Bare source names, since the sentence above names
throughput and subscriptions in the same order.

**2026-09-07**. Three follow-ups from a critique of the finished page.
The gap between the masthead and the toolbar rule is 24px, down from
32px: with the provenance line at one row the rule had started to float,
and 24px is one and a half of the masthead's 16px internal step. Tok/s
lost its "est" because throughput is a measurement (OpenRouter's p50)
and only Time is derived from it. Underlines now encode the click, solid
for the provenance links and dotted for tooltip headers. Page padding
tightens below the sm breakpoint. Left alone on purpose: the "Cost/perf"
header (the sentence's "cost per solved task" describes it), the v1.1
chip styling (matches DeepSWE, and more chips may follow), and the
right-aligned second toolbar row on phones.

**2026-09-30**. The masthead sentence now reads "coding agent", without
the hyphen, to match the description the
[site metadata](../../site-metadata/spec.md) puts in the static HTML.
