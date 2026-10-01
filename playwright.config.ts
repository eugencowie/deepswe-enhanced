import { defineConfig, devices } from "@playwright/test";

// Not Vite's default preview port, so a developer's own `vp preview` cannot
// clash with the suite's.
const port = 54321;
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  reporter: [["html", { open: "never" }]],
  use: { baseURL: origin },
  webServer: {
    // Serves the existing build: the e2e task and `validate` build first.
    command: `vp preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
  },
});
