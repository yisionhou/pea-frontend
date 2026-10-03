import { defineConfig } from '@playwright/test'
const preview = process.env.PEA_TEST_PREVIEW === 'true'
const baseURL = preview ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173'
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1536, height: 1024 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: preview ? 'npm run preview' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
  },
  reporter: 'list',
})
