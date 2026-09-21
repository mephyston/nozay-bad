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
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    /*
      Limite connue : un contrôle natif — `<input type="date">`, `type="time"` —
      se formate sur la langue de l'**interface** du navigateur, que ni `locale`
      ni `--lang` ne changent sur le *headless shell*. Ces champs apparaissent
      donc « 09/21/2026 » et « 08:00 PM » dans les références, là où un navigateur
      français affichera « 21/09/2026 » et « 20:00 ». C'est le rendu du système,
      pas le nôtre : la référence reste utile pour la mise en page, pas pour le
      format de la valeur.
    */
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Téléphone. Chromium plutôt que WebKit : `devices['iPhone 15']` bascule le moteur,
    // ce qui imposerait `playwright install webkit` en CI (~100 Mo) et un rendu de police
    // différent — donc une seconde famille de références pour aucun bug attrapé en plus.
    // Les références sont nommées par projet (`…-mobile-linux.png`), donc cet ajout ne
    // touche aucune référence existante.
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        // Chromium uniquement : pose le métaviewport et l'émulation tactile, sans quoi
        // les variantes `sm:` se comporteraient comme sur un bureau étroit.
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node scripts/serve-storybook.mjs',
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
