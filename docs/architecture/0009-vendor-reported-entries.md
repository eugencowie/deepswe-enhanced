# Vendor-reported entries fill the gaps until DeepSWE publishes a model

The DeepSWE leaderboard has published nothing since GPT-6 Astra (job finished 2026-09-01), and its maintainers have not answered requests for newer models. Meanwhile Anthropic, OpenAI, Google, xAI, DeepSeek and Meta publish their own DeepSWE v1.1 figures for Claude Opus 5.5, GPT-6.1 Sol and about ten others, usually as a bare percentage with no cost, tokens or steps. We decided to transcribe those claims into a hand-maintained snapshot, `data/vendor-reported.json`, whose entries join the leaderboard beside DeepSWE's as **vendor-reported entries**: shown by default, marked in the enhancement colour, each citing its own source, with missing figures left blank. A vendor-reported model lives only until DeepSWE publishes it. The DeepSWE refresh then deletes all of that model's vendor-reported entries in the Refresh PR, per model and never per effort level, so no model's Best entry compares a DeepSWE figure against a vendor's.

Three rules hold this together. Each entry carries its own provenance (source, URL, publication date, whether the figure was read from text or a chart), because every entry has a different source and the marker's tooltip needs it. Entries use our best guess at DeepSWE's model id, so the usual supersession is an id match. Load-time checks reject a model present in both files and two mapping entries sharing a non-null OpenRouter id. The second check catches a wrong id guess: DeepSWE's real id gets a generated mapping entry (ADR 0003) with the same OpenRouter id as ours, and the refresh treats that as a supersession too. The refresh supersedes before it writes, so a healthy Refresh PR never trips these checks (ADR 0004).

## Considered options

- **Accept other benchmarks vendors report** (SWE-bench Pro, Terminal-Bench): many more models, but the Pass@1 column would rank incomparable numbers, and cost per solved task divides by it.
- **Estimate the missing costs** from list prices and assumed token counts: keeps cost per solved task filled, but presents invented figures as measurements.
- **Supersede per entry**, keeping vendor figures for effort levels DeepSWE didn't run: shows more, but mixes two harnesses inside one model's Best-entry choice.
- **Fail at load on overlap with no refresh supersession**: simplest, but every Refresh PR that publishes a vendor-reported model would open red, which ADR 0004 rules out.
- **Hide vendor-reported rows behind a picker**: safer-looking, but hides the newest models, the reason the feature exists.
- **An id in our own namespace**, linked to DeepSWE's by hand later: no guessing, but supersession becomes a manual step every time.

## Consequences

- Vendor figures mostly exceed DeepSWE's best, so vendor-reported rows top the default Pass@1 view. The marker is what keeps that honest. If it misleads, the fix is a filter on provenance, never a special case in the sort.
- `LeaderboardRow.cost` becomes optional, so cost per solved task, the site's bang-for-buck figure, is blank for nearly every vendor-reported row.
- Coverage between snapshot and mapping now spans both files, and OpenRouter ids must be unique across the mapping.
- A generated OpenRouter id of `null` defeats the second match. The Refresh PR body lists new DeepSWE models beside the vendor-reported ones still standing, so a duplicate under two ids rests on the reviewer.
- Chart readings enter the data only after the maintainer checks them against the source, so a chart-read figure is as trustworthy as the maintainer's reading of it.
- The file is pinned to v1.1. When the project moves to a new DeepSWE version, the same change clears or replaces it.
