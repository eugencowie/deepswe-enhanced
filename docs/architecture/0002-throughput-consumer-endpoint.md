# Throughput measures the vendor's consumer endpoint

The leaderboard's cost figures describe the model's official API at list price, but throughput was an unweighted median across every OpenRouter provider — a different claim in the same row (DeepSeek V4 Flash read 38 tok/s while DeepSeek's own endpoint served ~80). We decided throughput is the p50 of the vendor's **consumer endpoint**: the vendor-run, default-tier endpoint a typical non-enterprise user would hit, selected by a per-vendor rule in the mapping (Anthropic → direct API not Claude-on-AWS, Google → AI Studio not Vertex, Moonshot → standard not Highspeed, xAI → standard not ZDR). OpenRouter stats remain the measurement source; the aggregation across its providers is what changed.

## Considered options

- **All-provider median** (the old rule): describes the open resale market, not the product the cost column prices; misread as an official-API speed.
- **Request-weighted statistics**: closer to "typical request" but drifts with traffic mix (Gemini 3.7 Flash: 93% of traffic rides Vertex at 64 tok/s while consumers see 145 on AI Studio).
- **Fastest provider** (OpenRouter's headline): a best-case number for a provider the user may never route to.

## Consequences

- Models whose vendor runs no consumer endpoint show a blank, never a substitute statistic; a refresh warns when a previously present consumer endpoint disappears.
- OpenRouter model IDs are revision-pinned wherever a pinned listing exists (unversioned aliases silently drifted to older revisions for both DeepSeek V4 models). The UI does not show revisions; the mapped ID is exposed via a tooltip on the model name.
- A consumer endpoint OpenRouter has demoted (non-zero `status`) is still read: the one endpoint the rule selects has no fallback, so filtering on status blanked a model through a brief outage. The refresh warns the status instead ([automated-refresh ticket 11](../planning/automated-refresh/tickets/11-capture-demoted-consumer-endpoints.md)).
- Historical entries show current throughput, not the value at benchmark time.
