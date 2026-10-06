import { expect, test, type Page } from "@playwright/test";

import { createLeaderboard } from "../src/data/leaderboard.ts";
import {
  deepsweSnapshot,
  leaderboardSources,
  vendorReportedSnapshot,
} from "../src/data/sources.ts";

const { modelOptions } = createLeaderboard(leaderboardSources);
const modelCount = modelOptions.length;
// The All view shows every entry once, whichever source it came from.
const entryCount = deepsweSnapshot.entries.length + vendorReportedSnapshot.entries.length;

const bodyRows = (page: Page) => page.getByRole("table").locator("tbody tr");

test("the effort toggle switches between best and all entries", async ({ page }) => {
  await page.goto("./");

  await expect(bodyRows(page)).toHaveCount(modelCount);
  // Best keeps the best Pass@1, which for Fable is xhigh rather than max.
  await expect(page.getByRole("cell", { name: "Claude Fable 5 xhigh" })).toBeVisible();

  await page.getByRole("button", { name: "All effort levels" }).click();
  await expect(bodyRows(page)).toHaveCount(entryCount);

  await page.getByRole("button", { name: "Best", exact: true }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
});

test("the subscriptions picker swaps a family to one tier and shows discounts", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();

  // Each rung carries the monthly price and the tier-wide discount, plus
  // Fable's non-standard limit where it applies.
  const maxTwenty = page.getByRole("menuitemradio", { name: /Max 20x/ });
  await expect(maxTwenty).toContainText("$200/mo");
  await expect(maxTwenty).toContainText("−97.5%");
  await expect(maxTwenty).toContainText("Fable: −95%");
  await expect(page.getByRole("menuitemradio", { name: /^Plus/ })).not.toContainText("Fable");

  // The estimate disclaimer replaced the per-cell "(e)" marker.
  await expect(page.getByText("Subscription costs are estimates")).toBeVisible();

  // Picking a tier replaces the family's API rows: same count, new pricing.
  await maxTwenty.click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
  // The trigger shows the tier pick with its vendor mark; "Subscriptions"
  // stays in the accessible name.
  await expect(
    page.getByRole("button", { name: "Subscriptions: Anthropic Max 20x" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  // Claude rows carry the tier tag; ChatGPT rows are untouched API rows.
  await expect(page.getByRole("cell", { name: /Claude Fable 5 xhigh/ })).toContainText("Max 20x");
  await expect(page.getByRole("cell", { name: "GPT-5.5 xhigh" })).toBeVisible();

  // Back to API: the trigger goes quiet again.
  await page.getByRole("button", { name: "Subscriptions: Anthropic Max 20x" }).click();
  await page.getByRole("menuitemradio", { name: /^API/ }).first().click();
  await expect(page.getByRole("button", { name: /^Subscriptions$/ })).toBeVisible();
});

test("tier rows show the API cost struck out beside the effective cost", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();
  await page.getByRole("menuitemradio", { name: /Max 20x/ }).click();
  await page.keyboard.press("Escape");

  // One struck value in Cost, one in Cost/perf.
  const fableRow = page.getByRole("row", { name: /Claude Fable 5 xhigh/ });
  await expect(fableRow.locator("s")).toHaveCount(2);
  await expect(fableRow.locator("s").first()).toHaveText(/^\$/);
});

// Pro excludes Fable: it runs on usage credits at API rates, so its rows
// show the API cost once and the rung notes it at full price.
test("Fable's Pro rows show the API cost unstruck", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();
  const pro = page.getByRole("menuitemradio", { name: /^Pro\b/ }).first();
  await expect(pro).toContainText("Fable: full price");
  await pro.click();
  await page.keyboard.press("Escape");

  const fableRow = page.getByRole("row", { name: /Claude Fable 5 xhigh/ });
  await expect(fableRow).toContainText("Pro");
  await expect(fableRow.locator("s")).toHaveCount(0);
  await expect(
    page
      .getByRole("row", { name: /Claude Opus 5 / })
      .first()
      .locator("s"),
  ).toHaveCount(2);
});

test("changing filters never resets the sort and both picks surface in the trigger", async ({
  page,
}) => {
  await page.goto("./");
  // Cost starts ascending: lower is better, so a fresh sort leads with the
  // best value.
  await page.getByRole("button", { name: "Cost", exact: true }).click();
  const cost = page.getByRole("columnheader", { name: "Cost", exact: true });
  await expect(cost).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("button", { name: "All effort levels" }).click();
  await page.getByRole("button", { name: /^Subscriptions/ }).click();
  await page.getByRole("menuitemradio", { name: /Max 5x/ }).click();
  await page.getByRole("menuitemradio", { name: /^Plus/ }).click();
  await page.keyboard.press("Escape");

  await expect(cost).toHaveAttribute("aria-sort", "ascending");
  // Both non-API picks in the trigger, Claude first (column order).
  await expect(
    page.getByRole("button", { name: "Subscriptions: Anthropic Max 5x, OpenAI Plus" }),
  ).toBeVisible();
});

test("the models picker removes a model everywhere and can clear to empty", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Models/ }).click();

  // Each item leads with its vendor mark, whose aria-label joins the name.
  const fable = page.getByRole("menuitemcheckbox", {
    name: "Anthropic Claude Fable 5",
    exact: true,
  });
  await expect(fable.getByRole("img", { name: "Anthropic" })).toBeVisible();
  await fable.click();
  await expect(bodyRows(page)).toHaveCount(modelCount - 1);

  await page.getByRole("menuitem", { name: "Clear" }).click();
  await expect(
    page.getByText("No models selected. Use the Models menu to pick one or more."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: `Models (0/${modelCount})` })).toBeVisible();

  await page.getByRole("menuitem", { name: "Select all" }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
});

test("the vendor-reported toggle unlists those models and brings them back unselected", async ({
  page,
}) => {
  // Any vendor-reported model the data file holds, never a named one: the
  // refresh supersedes each once DeepSWE publishes it (ADR 0004).
  const vendorReported = modelOptions.filter((option) => option.vendorReported);
  test.skip(vendorReported.length === 0, "no vendor-reported entries");
  const [{ vendor, displayName }] = vendorReported;
  const deepsweCount = modelCount - vendorReported.length;
  await page.goto("./");
  await page.getByRole("button", { name: /^Models/ }).click();
  // The vendor mark's aria-label leads the item's name.
  const sample = page.getByRole("menuitemcheckbox", {
    name: `${vendor} ${displayName}`,
    exact: true,
  });
  const toggle = page.getByRole("menuitemcheckbox", { name: "Include vendor-reported" });

  // On by default: listed and selected.
  await expect(toggle).toBeChecked();
  await expect(sample).toBeChecked();

  // Off: unlisted, deselected, their rows gone.
  await toggle.click();
  await expect(sample).toBeHidden();
  await expect(
    page.getByRole("button", { name: `Models (${deepsweCount}/${deepsweCount})` }),
  ).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(deepsweCount);

  // On again: listed but left unselected until Select all.
  await toggle.click();
  await expect(sample).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: `Models (${deepsweCount}/${modelCount})` }),
  ).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(deepsweCount);

  await page.getByRole("menuitem", { name: "Select all" }).click();
  await expect(sample).toBeChecked();
  await expect(bodyRows(page)).toHaveCount(modelCount);
});
