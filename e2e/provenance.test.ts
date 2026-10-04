import { expect, test } from "@playwright/test";

import { vendorReportedSnapshot } from "../src/data/sources.ts";

// The masthead names vendor-reported scores only once there are some, dated by
// the newest claim (ADR 0009). Derived from the data file, so the test holds
// whether or not it has entries.
const newestClaim = vendorReportedSnapshot.entries
  .map((entry) => entry.publishedAt)
  .toSorted()
  .at(-1);

test("the masthead lists vendor-reported scores exactly when there are some", async ({ page }) => {
  await page.goto("./");

  const sources = page.getByText(/^Sources:/);
  await expect(sources).toBeVisible();
  if (newestClaim === undefined) {
    await expect(sources).not.toContainText("vendor-reported");
  } else {
    await expect(sources).toContainText(`, vendor-reported scores (${newestClaim}).`);
  }
});
