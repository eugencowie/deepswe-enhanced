# The refresh generates mapping entries for known vendors

The spec originally failed the refresh whenever a fetched model was missing from `data/model-mapping.json`, so every new leaderboard model forced a human mapping decision. In practice, for a model from a vendor already in the mapping, every field is mechanically derivable — so the failure only converted a mergeable PR into a weekly failure email until someone typed in values a script could have produced (`glm-5-3-flash`, 2026-08-27). We decided the refresh generates the entry itself when the model matches a **known vendor** — an OpenRouter org slug already present in the mapping — and the Refresh PR carries snapshot and mapping together, with PR review as the check. A model with no match is a new vendor and still fails the run: the vendor string, its mark, and its subscription family are judgment calls.

Derivation: `openrouterId` by matching the leaderboard model id against OpenRouter id suffixes with dots normalised to dashes (exact for 23 of 25 existing entries); variant listings (`:free`, `:batch`) and rolling aliases (`~…-latest`) are never match candidates. The id falls back to `null` when the matched listing has same-org dated siblings (revision pinning stays a human call per ADR 0002 — the undated `deepseek/deepseek-v4-pro` alias points at an older build than our pin) or when the match is ambiguous. An unreachable models API fails the run like any other fetch error — generating without the lookup cannot determine the vendor, and the run is retried by hand. `displayName` is OpenRouter's `name` minus the vendor prefix and any trailing revision token; `vendor` and `family` are copied from same-org entries, never from OpenRouter's vendor prefix (it names xAI "SpaceXAI"); `usageMultiplier` defaults to 1.0.

## Considered options

- **Fail-fast for every unmapped model** (the old rule): preserves a forced decision point, but for known vendors the "decision" is mechanical; the weekly failure email is a worse workspace than a reviewable diff.
- **Network-free stub with placeholder values**: keeps the refresh offline-deterministic, but a placeholder `openrouterId` starves the downstream throughput refresh, and placeholder names or vendors could merge; the refresh already depends on the network for the artifact itself.
- **Adopting OpenRouter names wholesale, revisions included**: makes the derivation trivial but puts revision dates in UI labels, which ADR 0002 deliberately keeps out of the UI.

## Consequences

- Merging the Refresh PR is the only human act for a new model from a known vendor; a refresh failure email now signals a genuinely new vendor or upstream breakage, not routine growth.
- The displayName derivation becomes the definition for all entries: `GLM-5.3`/`GLM-5.2` were renamed `GLM 5.3`/`GLM 5.2` to match it. DeepSeek names stay revision-free.
- A generated `openrouterId` of `null` shows as blank throughput and is the reviewer's cue to pin an id by hand.
- A default that happens to be wrong merges unless the reviewer catches it in the diff: a future half-rate Anthropic model at multiplier 1.0, or one a tier excludes generated without `excludedTiers` (a new Fable on Pro).
