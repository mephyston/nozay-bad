import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Liste des stories depuis l'index généré par `storybook build`.
type StoryIndex = { entries: Record<string, { id: string; type: string; title: string; name: string }> };
const indexPath = fileURLToPath(new URL('../../storybook-static/index.json', import.meta.url));
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as StoryIndex;
const stories = Object.values(index.entries).filter((e) => e.type === 'story');

async function gotoStory(page: Page, id: string) {
  // Rendu isolé de la story (sans le chrome du manager Storybook).
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  // Attend que le composant Svelte soit monté et les polices/tokens appliqués.
  await page.locator('#storybook-root').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
}

for (const story of stories) {
  test.describe(story.title, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`${story.name} — ${theme}`, async ({ page }) => {
        await gotoStory(page, story.id);
        await page.evaluate((t) => {
          document.documentElement.classList.toggle('dark', t === 'dark');
        }, theme);
        await expect(page.locator('#storybook-root')).toHaveScreenshot(
          `${story.id}--${theme}.png`,
        );
      });
    }
  });
}
