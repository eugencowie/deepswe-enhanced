import { renderToStaticMarkup } from "react-dom/server";
import { useTable } from "@tanstack/react-table";
import { describe, expect, test } from "vite-plus/test";

import { leaderboardTableOptions } from "./leaderboard-columns.tsx";
import { compareModel, type LeaderboardRow } from "@/data/leaderboard";

// A family-"none" API row on a vendor with no mark, at default effort and
// unmapped, so cell text is the figures alone. Tests override what they
// exercise.
const row = (overrides: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  model: "test-model",
  displayName: "Test Model",
  vendor: "Test",
  family: "none",
  accessRoute: "api",
  isBestEntry: true,
  provenance: { kind: "deepswe" },
  passAt1: 0.7364864,
  cost: { api: 11.8375, effective: 11.8375 },
  costPerSolvedTask: { api: 11.8375 / 0.7364864, effective: 11.8375 / 0.7364864 },
  outputTokens: 117565.69,
  steps: 99.04,
  throughputTokPerSec: 58.75,
  averageTimeSeconds: 74,
  ...overrides,
});

const { columns } = leaderboardTableOptions;

// One cell, rendered the way the table renders it: through the adapter and
// FlexRender, so the cell sees a real context rather than a hand-built one.
function Cell({ r, columnId }: { r: LeaderboardRow; columnId: string }) {
  const table = useTable({ ...leaderboardTableOptions, data: [r] });
  const cell = table
    .getRowModel()
    .rows[0].getAllCells()
    .find((c) => c.column.id === columnId)!;
  return <table.FlexRender cell={cell} />;
}
const markup = (columnId: string, r: LeaderboardRow) =>
  renderToStaticMarkup(<Cell r={r} columnId={columnId} />);
const text = (columnId: string, r: LeaderboardRow) => markup(columnId, r).replace(/<[^>]+>/g, "");

describe("columns", () => {
  test("lists the source columns first, then the derived ones", () => {
    expect(columns.map((c) => [c.id, c.header, c.meta?.derived ?? false])).toEqual([
      ["model", "Model", false],
      ["passAt1", "Pass@1", false],
      ["avgCost", "Cost", false],
      ["outTok", "Tokens", false],
      ["steps", "Steps", false],
      ["costPerf", "Cost/perf", true],
      ["avgTime", "Time", true],
      ["tokPerSec", "Tok/s", true],
    ]);
  });

  test("only Time is an estimate and only Pass@1 draws a bar", () => {
    expect(columns.filter((c) => c.meta?.estimate).map((c) => c.id)).toEqual(["avgTime"]);
    expect(columns.filter((c) => c.meta?.bar).map((c) => c.id)).toEqual(["passAt1"]);
  });

  test("right-aligns every column but Model", () => {
    expect(columns.filter((c) => c.meta?.align !== "end").map((c) => c.id)).toEqual(["model"]);
  });
});

describe("sort definitions", () => {
  test("defaults to Pass@1 descending, with a two-state toggle", () => {
    expect(leaderboardTableOptions.initialState?.sorting).toEqual([{ id: "passAt1", desc: true }]);
    expect(leaderboardTableOptions.enableSortingRemoval).toBe(false);
  });

  test("starts best-first: Pass@1 and Tok/s descending, everything else ascending", () => {
    expect(leaderboardTableOptions.sortDescFirst).toBe(false);
    expect(columns.filter((c) => c.sortDescFirst).map((c) => c.id)).toEqual([
      "passAt1",
      "tokPerSec",
    ]);
  });

  test("each figure column sorts by its own row value", () => {
    const accessorKeys = columns.map((c) => [c.id, "accessorKey" in c ? c.accessorKey : undefined]);
    expect(accessorKeys).toEqual([
      ["model", undefined],
      ["passAt1", "passAt1"],
      ["avgCost", undefined],
      ["outTok", "outputTokens"],
      ["steps", "steps"],
      ["costPerf", undefined],
      ["avgTime", "averageTimeSeconds"],
      ["tokPerSec", "throughputTokPerSec"],
    ]);
  });

  test("cost accessors return effective figures and preserve absent costs", () => {
    const tier = row({
      accessRoute: "claude-pro",
      cost: { api: 20, effective: 1 },
      costPerSolvedTask: { api: 40, effective: 2 },
    });
    const cost = columns.find((c) => c.id === "avgCost");
    const costPerf = columns.find((c) => c.id === "costPerf");
    if (!cost || !("accessorFn" in cost) || !costPerf || !("accessorFn" in costPerf)) {
      throw new Error("Cost columns must define function accessors");
    }
    expect(cost.accessorFn(tier, 0)).toBe(1);
    expect(costPerf.accessorFn(tier, 0)).toBe(2);
    expect(costPerf.accessorFn(row({ costPerSolvedTask: undefined }), 0)).toBeUndefined();
    expect(cost.accessorFn(row({ cost: undefined }), 0)).toBeUndefined();
  });

  test("every figure column places blanks last", () => {
    for (const c of columns) {
      if (c.id !== "model") expect(c.sortUndefined, c.id).toBe("last");
    }
  });

  test("the Model column orders by the Leaderboard's compareModel", () => {
    const rows = [
      row({ displayName: "B" }),
      row({ displayName: "A", effort: "max" }),
      row({ displayName: "A" }),
    ];
    function Order({ desc }: { desc: boolean }) {
      const table = useTable({
        ...leaderboardTableOptions,
        data: rows,
        initialState: { sorting: [{ id: "model", desc }] },
      });
      return (
        <>
          {table
            .getRowModel()
            .rows.map((r) => `${r.original.displayName} ${r.original.effort ?? ""}|`)}
        </>
      );
    }
    const label = (r: LeaderboardRow) => `${r.displayName} ${r.effort ?? ""}|`;
    expect(renderToStaticMarkup(<Order desc={false} />)).toBe(
      rows.toSorted(compareModel).map(label).join(""),
    );
    expect(renderToStaticMarkup(<Order desc />)).toBe(
      rows
        .toSorted((a, b) => compareModel(b, a))
        .map(label)
        .join(""),
    );
  });
});

describe("Model cell", () => {
  test("shows the display name, then the effort, then the access tag", () => {
    expect(text("model", row())).toBe("Test Model");
    expect(text("model", row({ effort: "xhigh" }))).toBe("Test Model xhigh");
    expect(
      text("model", row({ effort: "xhigh", accessTag: { label: "Max 20x", family: "claude" } })),
    ).toBe("Test Model xhighMax 20x");
  });

  test("exposes the pinned OpenRouter id in a tooltip only when mapped", () => {
    expect(markup("model", row())).toBe("Test Model");
    expect(markup("model", row({ openrouterId: "test/test-model" }))).toMatch(
      /^<span [^>]*data-slot="tooltip-trigger"[^>]*>Test Model<\/span>$/,
    );
  });
});

describe("vendor-reported marker", () => {
  const claim = row({
    effort: "max",
    provenance: {
      kind: "vendor-reported",
      source: "Claude Opus 9 System Card §8.3",
      sourceUrl: "https://www.anthropic.com/claude-opus-9",
      publishedAt: "2026-09-22",
      figureFrom: "text",
    },
  });

  test("follows the effort on vendor-reported rows, before any access tag", () => {
    expect(text("model", claim)).toBe("Test Model max vendor-reported");
    expect(text("model", { ...claim, accessTag: { label: "Pro", family: "claude" } })).toBe(
      "Test Model max vendor-reportedPro",
    );
  });

  test("links to the vendor's source in the same tab, like the masthead's sources", () => {
    const link = markup("model", claim).match(/<a [^>]*>vendor-reported<\/a>/)?.[0];
    expect(link).toContain('href="https://www.anthropic.com/claude-opus-9"');
    expect(link).not.toContain("target=");
  });

  // The tooltip is hover-only, so the accessible name carries the same note.
  test("names itself with the citation for screen readers", () => {
    const chart = {
      ...claim,
      provenance: { ...claim.provenance, figureFrom: "chart" as const },
    };
    expect(markup("model", chart)).toContain(
      'aria-label="vendor-reported: Reported by the vendor, not run by DeepSWE. ' +
        'Claude Opus 9 System Card §8.3, 2026-09-22. Read from a chart."',
    );
  });

  test("is absent on DeepSWE rows", () => {
    expect(markup("model", row({ effort: "max" }))).not.toMatch(/vendor-reported/);
  });
});

describe("figure cells", () => {
  test("Pass@1 is a whole percent", () => {
    expect(text("passAt1", row({ passAt1: 0.7364864 }))).toBe("74%");
    expect(text("passAt1", row({ passAt1: 0.728 }))).toBe("73%");
  });

  test("Cost is two-decimal currency, collapsing sub-cent values", () => {
    expect(text("avgCost", row({ cost: { api: 11.8375, effective: 11.8375 } }))).toBe("$11.84");
    expect(text("avgCost", row({ cost: { api: 1183.7, effective: 1183.7 } }))).toBe("$1,183.70");
    expect(text("avgCost", row({ cost: { api: 0.0061889, effective: 0.0061889 } }))).toBe("$0.01");
    expect(text("avgCost", row({ cost: { api: 0.004, effective: 0.004 } }))).toBe("$0.00");
  });

  test("tier rows strike out the API cost beside the effective cost", () => {
    const tier = row({
      accessRoute: "claude-max-20x",
      accessTag: { label: "Max 20x", family: "claude" },
      cost: { api: 11.8375, effective: 0.6064 },
      costPerSolvedTask: { api: 16, effective: 0.8 },
    });
    expect(markup("avgCost", tier)).toMatch(/^<s[^>]*>\$11\.84<\/s> \$0\.61$/);
    expect(markup("costPerf", tier)).toMatch(/^<s[^>]*>\$16\.00<\/s> \$0\.80$/);
    expect(markup("avgCost", row())).not.toContain("<s");
  });

  // Fable on Pro: the tier excludes it, so there is nothing to strike.
  test("tier rows at the API cost show it once, unstruck", () => {
    const excluded = row({
      accessRoute: "claude-pro",
      accessTag: { label: "Pro", family: "claude" },
      cost: { api: 11.8375, effective: 11.8375 },
      costPerSolvedTask: { api: 16, effective: 16 },
    });
    expect(markup("avgCost", excluded)).toBe("$11.84");
    expect(markup("costPerf", excluded)).toBe("$16.00");
  });

  test("Cost/perf blanks both values when Pass@1 is zero", () => {
    const zero = row({
      accessRoute: "claude-pro",
      accessTag: { label: "Pro", family: "claude" },
      passAt1: 0,
      costPerSolvedTask: undefined,
    });
    expect(markup("costPerf", zero)).toBe("–");
  });

  test("Tokens are thousands and Steps a whole number", () => {
    expect(text("outTok", row({ outputTokens: 117565.69 }))).toBe("118k");
    expect(text("outTok", row({ outputTokens: 3128 }))).toBe("3k");
    expect(text("steps", row({ steps: 99.04 }))).toBe("99");
    expect(text("steps", row({ steps: 123.5 }))).toBe("124");
  });

  test("Time is always minutes and seconds, rounded to the second", () => {
    expect(text("avgTime", row({ averageTimeSeconds: 74 }))).toBe("1m 14s");
    expect(text("avgTime", row({ averageTimeSeconds: 3850 }))).toBe("64m 10s");
    expect(text("avgTime", row({ averageTimeSeconds: 45 }))).toBe("0m 45s");
    expect(text("avgTime", row({ averageTimeSeconds: 74.6 }))).toBe("1m 15s");
    expect(text("avgTime", row({ averageTimeSeconds: 119.7 }))).toBe("2m 0s");
  });

  test("Tok/s always has one decimal", () => {
    expect(text("tokPerSec", row({ throughputTokPerSec: 58.75 }))).toBe("58.8");
    expect(text("tokPerSec", row({ throughputTokPerSec: 40 }))).toBe("40.0");
  });

  test("Time and Tok/s are blank without throughput", () => {
    const blank = row({ throughputTokPerSec: undefined, averageTimeSeconds: undefined });
    expect(text("avgTime", blank)).toBe("–");
    expect(text("tokPerSec", blank)).toBe("–");
  });

  // A vendor-reported entry usually states Pass@1 alone (ADR 0009).
  test("Cost, Tokens and Steps are blank when the entry states none", () => {
    for (const accessRoute of ["api", "claude-pro"] as const) {
      const blank = row({
        accessRoute,
        cost: undefined,
        costPerSolvedTask: undefined,
        outputTokens: undefined,
        steps: undefined,
      });
      expect(markup("avgCost", blank), accessRoute).toBe("–");
      expect(text("outTok", blank), accessRoute).toBe("–");
      expect(text("steps", blank), accessRoute).toBe("–");
    }
  });
});
