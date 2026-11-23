import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: { command: 'node scripts/servidor.mjs 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } }
  ]
});
