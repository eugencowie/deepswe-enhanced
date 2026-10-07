# A family's flagship is optional and its members are sourced

Ticket 05 gave every subscription family a **flagship** and every tier rung one note, the flagship's discount. ADR 0010 let every model in a family that SemiAnalysis didn't measure take the **daily driver**'s value. Both assumed a family like Claude or ChatGPT: a top model on tighter limits, and tiers that serve every model the vendor sells. Kimi Code is neither. SemiAnalysis measured one model, Kimi K3, and Moonshot's plan page offers its K2.7 Code only as "K2.7 Code HighSpeed" on Pro and above, which may not be the model DeepSWE ran ([subscription-data ticket 07](../planning/subscription-data/tickets/07-other-labs-coding-plans.md)). We decided:

- **The flagship is optional.** `families` in `tiers.json` names a daily driver and, optionally, a flagship with its label, as one object so a model can't go without its label. A family without one shows the fee and headline on each rung, with no note. A family with one still shows exactly one note per rung, and every tier measures or excludes it.
- **Membership is sourced.** A model joins a family only when a primary source (the vendor's plan page or docs) says the family's tiers serve it. Only then does it take the daily driver's value when unmeasured. Kimi K3 is in `kimi`; Kimi K2.7 Code stays in `none`, so a vendor's models can span a family and `none`.

## Considered options

- **A flagship for every family**, Kimi K3 as both daily driver and flagship: keeps the one-note rule, but the note would repeat the headline under a second label on every Kimi rung.
- **Every vendor model in the family** (ADR 0010's fallback unchanged): gives Kimi K2.7 Code tier rows at Kimi K3's value, for a model Kimi Code's tiers may not serve and SemiAnalysis didn't measure.

## Consequences

- Amends [subscription-data ticket 05](../planning/subscription-data/tickets/05-flagship-note.md)'s "one note per rung, always" to families with a flagship. `assertTierValues` checks the flagship only where a family declares one.
- Narrows [ADR 0010](0010-per-model-api-equivalent-values.md)'s daily-driver fallback to sourced members. Claude and ChatGPT membership predates the rule and stays as mapped.
- [ADR 0003](0003-refresh-generates-mapping-entries.md) copies a generated entry's family from same-vendor entries. When they span families, as Moonshot's now do, the refresh generates `none` and warns, so the reviewer decides with a source in hand rather than inheriting whichever entry came last.
- Families beyond Claude and ChatGPT sit in the Subscriptions picker alphabetically by vendor, wrapping the two-column route card onto further rows.
