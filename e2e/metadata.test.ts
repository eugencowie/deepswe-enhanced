import { expect, test } from "@playwright/test";

import { siteUrl } from "../playwright.config.ts";

// What a crawler that runs no JavaScript reads: the built HTML as served,
// before React replaces the fallback inside #root.
test.use({ javaScriptEnabled: false });

const description =
  "DeepSWE's coding agent leaderboard, plus what it doesn't report: cost per solved task, time at the consumer API throughput, and the effective cost on a subscription.";

test("the head describes the site", async ({ page }) => {
  await page.goto("./");

  await expect(page).toHaveTitle("DeepSWE enhanced");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "DeepSWE enhanced",
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    description,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
});

test("the fallback says what the site is", async ({ page }) => {
  // The fallback's logo mark is a root-absolute reference in index.html, so
  // it needs the same base-path guard as the smoke test.
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.url()} (HTTP ${response.status()})`);
    }
  });

  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: "DeepSWE enhanced" })).toBeVisible();
  await expect(page.locator("#root").getByText(description)).toBeVisible();
  expect(failures).toEqual([]);
});

test("the build stamps the site URL it is given", async ({ page }) => {
  await page.goto("./");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", siteUrl);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", siteUrl);

  const jsonLd: unknown = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "",
  );
  expect(jsonLd).toEqual({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DeepSWE enhanced",
    description,
    url: siteUrl,
    applicationCategory: "DeveloperApplication",
    isAccessibleForFree: true,
  });
});
