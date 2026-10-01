import { expect, test } from "@playwright/test";

// What a crawler that runs no JavaScript reads: the built HTML as served,
// before React replaces the fallback inside #root.
test.use({ javaScriptEnabled: false });

const description =
  "DeepSWE's coding agent leaderboard, plus what it doesn't report: cost per solved task, time at the consumer API throughput, and the effective cost on a Claude or ChatGPT subscription.";

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
  // The fallback's logo mark is a separate request, so a broken reference to
  // it shows up as a failure.
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

test("the URL tags and the JSON-LD block carry one filled-in site URL", async ({ page }) => {
  await page.goto("./");

  // The site URL is a deploy-time setting, so its value is not pinned here:
  // only that the build filled the placeholder, and filled it the same way
  // everywhere.
  const siteUrl = (await page.locator('link[rel="canonical"]').getAttribute("href")) ?? "";
  expect(siteUrl).not.toBe("");
  expect(siteUrl).not.toContain("%VITE_SITE_URL%");
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
