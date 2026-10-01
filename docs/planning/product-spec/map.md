# Map: Subsidised leaderboard

Labels: wayfinder:map

## Destination

A spec at `docs/planning/product-spec/spec.md`, executable by a build session without further decisions, for a static web app that extends the DeepSWE v1.1 leaderboard with average time (via OpenRouter throughput), subscription-subsidised effective costs (via SemiAnalysis tier figures), and cost per solved task — as separate sortable/filterable rows per access route.

## Notes

- Vocabulary lives in [docs/context.md](../../context.md); use its terms (effective cost, access route, usage multiplier, …).
- This is deliberately a **rough approximation** tool: consistent roughness beats false precision. Don't gold-plate the maths.
- User preferences: Vite/React/TypeScript ecosystem; GitHub Pages hosting; user can transcribe source data by hand if no machine-readable source exists.
- Research tickets are **not** auto-run (see `docs/agents/issue-tracker.md`): leave them unclaimed for the user to launch.

## Decisions so far

- [Charting grilling: destination and core decisions](tickets/01-charting-grilling.md): destination (spec), row model (API row + six tier rows), all maths (subsidisation factor with usage multiplier, Fable 5 = 0.5; average time; cost per solved task), SemiAnalysis tier figures captured verbatim, hand-curated model mapping, table UX (columns, filters, per-model include/exclude, default sort Pass@1 desc), stack (Vite + React + TS + TanStack Table, build-time data import, TS refresh scripts), hosting (GitHub Pages, public repo).
- [DeepSWE v1.1 source and metric semantics](tickets/02-research-deepswe-leaderboard-data.md): use the public versioned leaderboard JSON and versions manifest; keep all 62 configurations; apply the site's three v1.1 display-cost factors; treat Pass@1 as scored-attempt pass rate and cost, output tokens, and steps as per-attempt means; pin v1.1 while monitoring both the manifest and live artifact timestamp.
- [OpenRouter throughput research](research/openrouter-throughput.md): the documented model-endpoints API returns 30-minute provider-level p50 throughput with bearer authentication; use the median across non-null default-tier endpoints, not the model page's fastest-provider headline. All 25 current DeepSWE v1.1 models have OpenRouter listings. The snapshot also records three Codex-family references and the limits of the average-time estimate.
- [Write the spec](tickets/04-write-spec.md): the destination — [spec.md](spec.md) approved by the user after a grilling review; settled token semantics (reasoning-inclusive on both sides) and the version-bump workflow, added explicit display-name/vendor mapping fields, API-only default view, 3-sig-fig cost formatting, local-only OpenRouter key, and the Vite+/pnpm/mise toolchain with `vp run ready` gating deploy.
- [Scaffold and deploy the foundation](../project-structure/tickets/01-scaffold-and-deploy-foundation.md): template site live at <https://eugencowie.github.io/deepswe-enhanced/> with `vp run ready` gating deploys; base path derived at deploy time, `ci.yml` runs the gate on pull requests too, tailnet dev scripts added; scaffold conventions and the shadcn/ui (Base UI) + Tailwind + Playwright-smoke stack recorded in [ADR 0001](../../architecture/0001-toolchain-conventions.md).

**Destination reached** — no open tickets remain. The build proceeds from [spec.md](spec.md) as its own effort.

## Not yet specified

(empty — all fog was settled in the spec)

## Out of scope

- **Cloudflare Workers hosting** — user ruled it unnecessary; GitHub Pages chosen. Reversed on 2026-10-01 by [continuous-deployment ticket 02](../continuous-deployment/tickets/02-cloudflare-workers-builds.md).
- **Accuracy modelling beyond the approximation** — latency, per-step overhead, cache-pricing effects; the tool's point is rough comparability.
- **Building the app** — the destination is the spec; the build is a follow-on effort once ticket 04 closes.
