import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : "msedge"),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI && (!process.env.FULL_STACK_API_URL || !!process.env.FULL_STACK_API_PROXY_FROM),
    timeout: 120_000,
  },
});
