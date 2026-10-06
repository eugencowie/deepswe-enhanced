import { expect, test } from "@playwright/test";

import { modelMapping, vendorReportedSnapshot } from "../src/data/sources.ts";

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

// Every vendor-reported row's name links to its entry's source and is
// described by its citation (ticket 07). Expected rows come from the data
// file, matched by name and effort, so the test names no live model.
test("every vendor-reported row links its name to its source", async ({ page }) => {
  const { entries } = vendorReportedSnapshot;
  test.skip(entries.length === 0, "no vendor-reported entries");
  const displayName = (model: string) =>
    modelMapping.find((entry) => entry.leaderboardModel === model)!.displayName;
  const expected = entries
    .map((entry) => ({
      cell: `${displayName(entry.model)} ${entry.effort}`,
      href: entry.sourceUrl,
      source: entry.source,
    }))
    .toSorted((a, b) => a.cell.localeCompare(b.cell));

  await page.goto("./");
  await page.getByRole("button", { name: "All effort levels" }).click();
  const links = page.getByRole("table").locator("tbody a");
  await expect(links).toHaveCount(entries.length);

  const shown = await links.evaluateAll((anchors) =>
    anchors.map((a) => ({
      cell: (a.closest("td") as HTMLElement).innerText.trim(),
      href: a.getAttribute("href"),
      description: document.getElementById(a.getAttribute("aria-describedby") ?? "")?.textContent,
    })),
  );
  expect(
    shown
      .map(({ cell, href }) => ({ cell, href }))
      .toSorted((a, b) => a.cell.localeCompare(b.cell)),
  ).toEqual(expected.map(({ cell, href }) => ({ cell, href })));
  for (const { cell, description } of shown) {
    const { source } = expected.find((e) => e.cell === cell)!;
    expect(description, cell).toContain(source);
  }
  // The description reaches the accessibility tree, not just the markup.
  await expect(links.first()).toHaveAccessibleDescription(/^Reported by the vendor/);
});
