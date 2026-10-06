import { useMemo, useState } from "react";

import { LeaderboardTable } from "@/components/leaderboard-table";
import { LeaderboardToolbar } from "@/components/leaderboard-toolbar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { createLeaderboard } from "@/data/leaderboard";
import {
  deepsweSnapshot,
  leaderboardSources,
  throughputSnapshot,
  tiersSnapshot,
  vendorReportedSnapshot,
} from "@/data/sources";

const leaderboard = createLeaderboard(leaderboardSources);

// The UTC date of a snapshot timestamp, robust to non-UTC offsets in a
// future refresh (a plain slice would take the offset-local date).
const utcDate = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

const deepsweDate = utcDate(deepsweSnapshot.source_generated_at);
const openrouterDate = utcDate(throughputSnapshot.capturedAt);
const semianalysisDate = utcDate(tiersSnapshot.publishedAt);
// The newest claim's date, or undefined while there are no vendor-reported
// entries; the schema keeps them ISO dates, which sort as strings.
const vendorReportedDate = vendorReportedSnapshot.entries
  .map((entry) => entry.publishedAt)
  .toSorted()
  .at(-1);

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="underline underline-offset-4 hover:text-foreground">
      {children}
    </a>
  );
}

function App() {
  const [filters, setFilters] = useState(leaderboard.defaultFilters);
  const visibleRows = useMemo(() => leaderboard.visibleRows(filters), [filters]);

  return (
    // max-w-5xl: wide enough for tier rows' struck-out API costs.
    // index.html carries a static copy of this wrapper and the header (title
    // and sentence) as the no-JavaScript fallback; keep the two in step. React
    // replaces the copy on mount. It leaves out the provenance line on purpose,
    // since the dates come from the data files.
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-3 text-[28px] leading-none tracking-tight">
            <svg aria-hidden="true" className="brand-mark size-10 shrink-0" viewBox="0 0 160 144">
              <use href="/favicon.svg#mark" />
            </svg>
            <span>
              <span className="font-bold">DeepSWE</span>{" "}
              <span className="font-light text-brand">enhanced</span>
            </span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-pretty">
            DeepSWE's coding agent leaderboard, plus what it doesn't report: cost per solved task,
            time at the consumer API throughput, and the effective cost on a Claude or ChatGPT
            subscription.
          </p>
          {/* Provenance: every figure on the page traces to one of these,
              listed in the order the sentence above mentions them, then the
              vendor-reported scores once there are any. That item alone is
              unlinked: each row's name cites its own source (ADR 0009). Each
              date is the upstream figure's own age, not when this project
              fetched it. */}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Sources: <SourceLink href={deepsweSnapshot.sourceUrl}>DeepSWE</SourceLink> (
            {deepsweDate}), <SourceLink href={throughputSnapshot.sourceUrl}>OpenRouter</SourceLink>{" "}
            ({openrouterDate}), <SourceLink href={tiersSnapshot.sourceUrl}>SemiAnalysis</SourceLink>{" "}
            ({semianalysisDate})
            {vendorReportedDate !== undefined && (
              <>, vendor-reported scores ({vendorReportedDate})</>
            )}
            .
          </p>
        </div>
        <ModeToggle />
      </header>
      <main className="mt-6 flex flex-col gap-3 border-t pt-3">
        <LeaderboardToolbar
          filters={filters}
          onChange={setFilters}
          models={leaderboard.modelOptions}
          pickerFamilies={leaderboard.pickerFamilies}
        />
        <LeaderboardTable
          rows={visibleRows}
          empty="No models selected. Use the Models menu to pick one or more."
        />
      </main>
    </div>
  );
}

export default App;
