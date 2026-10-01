import { expect, test } from "@playwright/test";

import { createLeaderboard } from "../src/data/leaderboard.ts";
import { leaderboardSources } from "../src/data/sources.ts";

// The default view: best entries, API rows only (tickets 09 and 22).
const leaderboard = createLeaderboard(leaderboardSources);
const rowCount = leaderboard.visibleRows(leaderboard.defaultFilters()).length;

test("the build renders the table with no failed requests", async ({ page }) => {
  const failures: string[] = [];
  page.on("requestfailed", (request) => {
    failures.push(`${request.url()} (${request.failure()?.errorText})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.url()} (HTTP ${response.status()})`);
    }
  });

  await page.goto("./");

  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  // Count against the derived rows, not a literal, so a data refresh that
  // changes the entry count or ranking cannot fail the smoke for a reason
  // that has nothing to do with the page loading.
  await expect(table.locator("tbody tr")).toHaveCount(rowCount);

  expect(failures).toEqual([]);
});
