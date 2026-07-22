// Shared skeleton for every plugin's playwright.config.ts. All e2e suites
// drive a persistent Chromium profile and/or a fixed-port local server, so
// they must stay serial.
export const baseConfig = {
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: [['list']],
};
