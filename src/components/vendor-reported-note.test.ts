import { describe, expect, test } from "vite-plus/test";

import type { VendorReportedProvenance } from "@/data/leaderboard";
import { vendorReportedNote } from "./vendor-reported-note.ts";

const claim: VendorReportedProvenance = {
  kind: "vendor-reported",
  source: "Claude Opus 9 System Card §8.3",
  sourceUrl: "https://www.anthropic.com/claude-opus-9",
  publishedAt: "2026-09-22",
  figureFrom: "text",
};

describe("vendorReportedNote", () => {
  test("cites the source and its date, and says DeepSWE didn't run it", () => {
    expect(vendorReportedNote(claim)).toBe(
      "Reported by the vendor, not run by DeepSWE. Claude Opus 9 System Card §8.3, 2026-09-22.",
    );
  });

  test("adds the harness and trials when stated", () => {
    expect(vendorReportedNote({ ...claim, harness: "mini-swe-agent", trials: 5 })).toBe(
      "Reported by the vendor, not run by DeepSWE. Claude Opus 9 System Card §8.3, 2026-09-22. " +
        "Harness: mini-swe-agent. 5 trials.",
    );
    expect(vendorReportedNote({ ...claim, trials: 1 })).toMatch(/ 1 trial\.$/);
  });

  test("says when the figure was read from a chart", () => {
    expect(vendorReportedNote({ ...claim, figureFrom: "chart" })).toMatch(
      / Figure read from a chart\.$/,
    );
  });
});
