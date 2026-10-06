import { describe, expect, test } from "vite-plus/test";

import { vendorReportedMethod } from "./vendor-reported-note.ts";

describe("vendorReportedMethod", () => {
  test("states the harness and trials when the vendor does", () => {
    expect(vendorReportedMethod({ harness: "mini-swe-agent", trials: 5 })).toBe(
      "Harness: mini-swe-agent. 5 trials.",
    );
    expect(vendorReportedMethod({ harness: "mini-swe-agent" })).toBe("Harness: mini-swe-agent.");
    expect(vendorReportedMethod({ trials: 1 })).toBe("1 trial.");
  });

  test("is absent when the vendor states neither", () => {
    expect(vendorReportedMethod({})).toBeUndefined();
  });
});
