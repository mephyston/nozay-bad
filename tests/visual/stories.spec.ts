import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Liste des stories depuis l'index généré par `storybook build`.
type StoryIndex = { entries: Record<string, { id: string; type: string; title: string; name: string }> };
const indexPath = fileURLToPath(new URL('../../storybook-static/index.json', import.meta.url));
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as StoryIndex;
const stories = Object.values(index.entries).filter((e) => e.type === 'story');

// Noms des thèmes déclarés par `withThemeByClassName` dans .storybook/preview.ts.
const THEMES = { light: 'Clair', dark: 'Sombre' } as const;

async function gotoStory(page: Page, id: string, theme: keyof typeof THEMES) {
  // Le thème passe par le global Storybook, et non par un `classList.add('dark')`
  // après coup : le décorateur `withThemeByClassName` réapplique sa propre classe
  // sur `<html>` et effaçait le basculement. Les références « sombre » étaient donc
  // octet pour octet identiques aux claires — la moitié de la suite ne protégeait rien.
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${THEMES[theme]}`);
  // Attend que le composant Svelte soit monté et les polices/tokens appliqués.
  await page.locator('#storybook-root').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  // Le décorateur applique la classe au rendu : on l'attend plutôt que de la poser.
  await page
    .locator(theme === 'dark' ? 'html.dark' : 'html:not(.dark)')
    .waitFor({ state: 'attached' });
}

for (const story of stories) {
  test.describe(story.title, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`${story.name} — ${theme}`, async ({ page }) => {
        await gotoStory(page, story.id, theme);
        await expect(page.locator('#storybook-root')).toHaveScreenshot(
          `${story.id}--${theme}.png`,
        );
      });
    }
  });
}
