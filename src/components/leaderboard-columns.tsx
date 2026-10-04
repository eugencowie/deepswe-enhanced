// The leaderboard's columns and its sort rule, as TanStack Table options:
// every column's header, cell, presentation meta and sort facts, plus the
// default sort, the two-state toggle and blank-last placement. The table
// spreads these options over its rows and renders what the instance says.

import type { ReactNode } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  metaHelper,
  rowSortingFeature,
  tableFeatures,
  tableOptions,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";
import { VendorMark } from "@/components/vendor-mark";
import { compareModel, type CostPair, type LeaderboardRow } from "@/data/leaderboard";

// What the table reads to render a column beyond its header and cell.
export type ColumnMeta = {
  tooltip?: string;
  // Figures are estimates rather than measurements: the header carries a
  // small muted "est" and the tooltip says what is left out.
  estimate?: true;
  // Derived columns are computed by this project rather than reported by the
  // DeepSWE leaderboard: an enhancement, so they carry the brand tint and a
  // rule sets them apart from the source columns.
  derived?: true;
  // Figures are right-aligned; neither TanStack nor shadcn aligns by type.
  align?: "end";
  // The accessor value, a 0..1 fraction, drawn as a bar behind the cell so
  // the column's order reads at a glance. Pass@1 only: it is the one column
  // on a fixed scale.
  bar?: true;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnMeta: metaHelper<ColumnMeta>(),
});

const helper = createColumnHelper<typeof features, LeaderboardRow>();

// Every figure column: right-aligned, and blank cells last in both sort
// directions. TanStack negates a comparator for descending order but applies
// sortUndefined before that, which is why blanks are undefined on the row.
const figure = (meta: Omit<ColumnMeta, "align"> = {}) =>
  ({ sortUndefined: "last", meta: { align: "end", ...meta } }) as const;

const columns = helper.columns([
  helper.accessor((row) => row.displayName, {
    id: "model",
    header: "Model",
    sortFn: (a, b) => compareModel(a.original, b.original),
    cell: ({ row }) => modelCell(row.original),
  }),
  helper.accessor("passAt1", {
    id: "passAt1",
    header: "Pass@1",
    ...figure({ bar: true }),
    sortDescFirst: true,
    cell: figureCell(formatPassAt1),
  }),
  helper.accessor((row) => row.cost?.effective, {
    id: "avgCost",
    header: "Cost",
    ...figure(),
    cell: ({ row }) => costCell(row.original.cost),
  }),
  helper.accessor("outputTokens", {
    id: "outTok",
    header: "Tokens",
    ...figure(),
    cell: figureCell(formatTokens),
  }),
  helper.accessor("steps", {
    id: "steps",
    header: "Steps",
    ...figure(),
    cell: figureCell(formatInteger),
  }),
  helper.accessor((row) => row.costPerSolvedTask?.effective, {
    id: "costPerf",
    header: "Cost/perf",
    ...figure({ derived: true, tooltip: "Cost ÷ Pass@1: what you pay per task actually solved" }),
    cell: ({ row }) => costCell(row.original.costPerSolvedTask),
  }),
  helper.accessor("averageTimeSeconds", {
    id: "avgTime",
    header: "Time",
    ...figure({
      derived: true,
      estimate: true,
      tooltip:
        "Output tokens ÷ vendor API throughput; excludes tool execution and gaps between the agent's calls",
    }),
    cell: figureCell(formatDuration),
  }),
  helper.accessor("throughputTokPerSec", {
    id: "tokPerSec",
    header: "Tok/s",
    ...figure({
      derived: true,
      // A measurement (OpenRouter's p50), not an estimate: only Time, which
      // is derived from it, carries "est".
      tooltip:
        "p50 throughput of the vendor's own consumer API (via OpenRouter stats). Not the speed measured in the benchmark run",
    }),
    sortDescFirst: true,
    cell: figureCell(formatThroughput),
  }),
]);

// The sort rule: Pass@1 descending by default; a sorted column flips, a
// fresh column starts best-first (ascending unless the column says
// otherwise); there is no unsorted state. Sort state is the instance's own
// and survives row changes.
export const leaderboardTableOptions = tableOptions<typeof features, LeaderboardRow>({
  features,
  columns,
  getRowId: (row) => `${row.model}|${row.effort ?? ""}|${row.accessRoute}`,
  initialState: { sorting: [{ id: "passAt1", desc: true }] },
  enableSortingRemoval: false,
  sortDescFirst: false,
});

// Access tags are colour-coded by subscription family.
const tagClassByFamily = {
  claude: "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400",
  chatgpt: "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400",
};

// The display name mirrors DeepSWE and omits the model revision; the tooltip
// exposes the pinned OpenRouter id for readers cross-checking model cards
// (ADR 0002).
function modelCell(row: LeaderboardRow): ReactNode {
  return (
    <>
      <VendorMark vendor={row.vendor} className="mr-1.5" />
      {row.openrouterId === undefined ? (
        row.displayName
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span />}>{row.displayName}</TooltipTrigger>
          <TooltipContent>{row.openrouterId}</TooltipContent>
        </Tooltip>
      )}
      {row.effort !== undefined && (
        // A real space, so copied text and the accessible name stay readable.
        <>
          {" "}
          <span className="ml-1 text-xs text-muted-foreground">{row.effort}</span>
        </>
      )}
      {row.accessTag && (
        <Badge variant="outline" className={cn("ml-2", tagClassByFamily[row.accessTag.family])}>
          {row.accessTag.label}
        </Badge>
      )}
    </>
  );
}

// The API cost is struck out only where the route discounts it: API rows, and
// tier rows on a tier that excludes the model, have nothing to strike.
function costCell(cost: CostPair | undefined): ReactNode {
  if (cost === undefined) return BLANK;
  return cost.effective === cost.api
    ? formatUsd(cost.effective)
    : struckCost({ apiUsd: cost.api, effectiveUsd: cost.effective });
}

// A discounted cost: the API cost struck out beside the effective cost.
function struckCost({ apiUsd, effectiveUsd }: { apiUsd: number; effectiveUsd: number }): ReactNode {
  return (
    <>
      <s className="text-muted-foreground">{formatUsd(apiUsd)}</s> {formatUsd(effectiveUsd)}
    </>
  );
}

const BLANK = "–";

function blankOr(value: number | undefined, format: (value: number) => string): string {
  return value === undefined ? BLANK : format(value);
}

// A figure cell: the accessor value formatted, or the blank marker.
function figureCell(format: (value: number) => string) {
  return ({ getValue }: { getValue: () => number | undefined }) => blankOr(getValue(), format);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Standard two-decimal currency. Sub-cent values collapse to $0.01 or $0.00
// on purpose: tier rows produce tiny costs, and "effectively free" reads
// better than a string of leading zeros.
function formatUsd(value: number): string {
  return usd.format(value);
}

function formatPassAt1(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function formatTokens(value: number): string {
  return `${Math.round(value / 1000)}k`;
}

// Always one decimal, so a right-aligned column doesn't go ragged on whole
// numbers.
function formatThroughput(value: number): string {
  return value.toFixed(1);
}

// Always "Xm Ys": minutes ride past 60 and sub-minute values keep the zero
// minute, so the column reads uniformly across its whole range.
function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

function formatInteger(value: number): string {
  return `${Math.round(value)}`;
}
