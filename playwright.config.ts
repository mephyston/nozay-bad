import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SB_PORT ?? 6099);

// Régression visuelle des stories du design system (@nba/ui).
// Les références sont commitées sous tests/visual/__screenshots__/ ;
// `npm run test:visual:update` les régénère après un changement DS assumé.
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Tolérance minime : anti-aliasing des sous-pixels selon la plateforme.
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: 'light',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node scripts/serve-storybook.mjs',
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
