import { defineConfig, devices } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const base = "/e2e/";
// Stands in for the deployed site URL the deploy workflow passes to the build.
// Deliberately not the preview origin, so a test can tell the two apart.
export const siteUrl = `https://example.test${base}`;

export default defineConfig({
  testDir: "e2e",
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  reporter: [["html", { open: "never" }]],
  use: { baseURL: `${origin}${base}` },
  webServer: {
    command: `vp build --base ${base} && vp preview --base ${base} --host 127.0.0.1 --port 4173 --strictPort`,
    url: `${origin}${base}`,
    env: { VITE_SITE_URL: siteUrl },
    // Playwright recommends `!process.env.CI`, but a plain `vp preview` also
    // uses port 4173 and serves base `/`. Reusing that server would run the
    // smoke against the wrong base or a stale build, so always start fresh.
    reuseExistingServer: false,
  },
});
