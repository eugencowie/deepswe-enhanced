import { expect, test } from "@playwright/test";

import { createLeaderboard } from "../src/data/leaderboard.ts";
import { leaderboardSources, vendorReportedSnapshot } from "../src/data/sources.ts";

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

// Every vendor-reported row's name opens a popover citing its entry's source
// and linking it (vendor-reported-data ticket 07). Opened by keyboard: Enter
// moves focus onto the link. Expected rows come from the data file,
// matched by name and effort, so the test names no live model.
test("every vendor-reported row's name opens a popover linking its source", async ({ page }) => {
  const { entries } = vendorReportedSnapshot;
  test.skip(entries.length === 0, "no vendor-reported entries");
  const { modelOptions } = createLeaderboard(leaderboardSources);
  const displayName = (model: string) =>
    modelOptions.find((option) => option.model === model)!.displayName;
  const expected = entries
    .map((entry) => ({
      cell: `${displayName(entry.model)} ${entry.effort}`,
      href: entry.sourceUrl,
      source: entry.source,
    }))
    .toSorted((a, b) => a.cell.localeCompare(b.cell));

  await page.goto("./");
  await page.getByRole("button", { name: "All effort levels" }).click();
  const names = page.getByRole("table").locator("tbody").getByRole("button");
  await expect(names).toHaveCount(entries.length);

  const shown = [];
  for (const name of await names.all()) {
    const cell = await name.locator("xpath=ancestor::td").innerText();
    await name.focus();
    await page.keyboard.press("Enter");
    const popover = page.getByRole("dialog");
    await expect(popover).toContainText("Reported by the vendor, not run by DeepSWE.");
    const link = popover.getByRole("link");
    await expect(link).toBeFocused();
    shown.push({
      cell: cell.trim(),
      href: await link.getAttribute("href"),
      source: await link.innerText(),
    });
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
  }
  expect(shown.toSorted((a, b) => a.cell.localeCompare(b.cell))).toEqual(expected);
});
