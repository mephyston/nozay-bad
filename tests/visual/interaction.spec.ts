import { test, expect, type Page } from '@playwright/test';

/**
 * Ce que les captures ne voient pas.
 *
 * Une feuille peut s'afficher parfaitement et n'être plus qu'une image :
 * `bits-ui` pose `pointer-events: none` sur le `body` tant qu'un dialogue est
 * ouvert, et ne réactive que son propre contenu par un `style` en ligne. Un
 * attribut `style` posé par-dessus l'écrasait — le formulaire était intact à
 * l'écran, et mort au doigt. Aucune régression visuelle ne pouvait l'attraper.
 */
async function ouvrirStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:Clair`);
  await page.locator('#storybook-root').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('ResponsiveSheet', () => {
  for (const palier of ['palier-bas', 'palier-haut'] as const) {
    test(`reste utilisable au ${palier}`, async ({ page }) => {
      await ouvrirStory(page, `patterns-responsivesheet--${palier}`);

      const champ = page.locator('#storybook-root input').first();
      await expect(champ).toBeVisible();

      // La cause racine, testée pour elle-même : le contenu doit recevoir les événements.
      await expect(champ).toHaveCSS('pointer-events', 'auto');

      await champ.fill('Gymnase de la Noue');
      await expect(champ).toHaveValue('Gymnase de la Noue');

      // Le pied vit hors du `<form>` : ses boutons doivent rester atteignables.
      await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
      await page.getByRole('button', { name: 'Enregistrer' }).click();
    });
  }
});

test.describe('ListRow', () => {
  test('le menu escamoté est atteignable au clavier', async ({ page }) => {
    await ouvrirStory(page, 'patterns-listrow--avec-actions');

    const declencheur = page.locator('[data-row-menu]').first();
    await expect(declencheur).toBeAttached();

    // Invisible au doigt, mais focusable : c'est la voie clavier des actions de ligne.
    await declencheur.focus();
    await expect(declencheur).toBeFocused();
  });
});

test.describe('PullToRefresh', () => {
  test('le témoin apparaît quand on tire vers le bas', async ({ page }) => {
    await ouvrirStory(page, 'actions-pulltorefresh--liste');

    const conteneur = page.locator('[data-scroll-root]');
    await expect(conteneur).toBeVisible();

    // Événements tactiles synthétiques : c'est le seul chemin que l'action écoute,
    // précisément parce que les événements `pointer` sont annulés par le rebond natif.
    const etat = await page.evaluate(async () => {
      const cible = document.querySelector('[data-scroll-root]') as HTMLElement;
      const boite = cible.getBoundingClientRect();
      const x = boite.left + boite.width / 2;
      const y0 = boite.top + 40;

      const toucher = (clientY: number) =>
        new Touch({ identifier: 1, target: cible, clientX: x, clientY });
      const envoyer = (type: string, clientY: number) =>
        cible.dispatchEvent(
          new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [toucher(clientY)],
            changedTouches: [toucher(clientY)],
            bubbles: true,
            cancelable: true,
          })
        );

      envoyer('touchstart', y0);
      for (const d of [20, 60, 120, 180]) envoyer('touchmove', y0 + d);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const temoin = document.querySelector('[data-nba-ptr]') as HTMLElement;
      const releve = {
        temoinPresent: !!temoin,
        opacite: temoin ? Number(getComputedStyle(temoin).opacity) : 0,
        conteneurDeplace: cible.style.transform !== '',
        marqueEnCours: cible.hasAttribute('data-pulling'),
      };
      envoyer('touchend', y0 + 180);
      return releve;
    });

    expect(etat.temoinPresent).toBe(true);
    expect(etat.marqueEnCours).toBe(true);
    expect(etat.conteneurDeplace).toBe(true);
    // Le plancher d'opacité : le témoin doit se voir dès que le geste est pris.
    expect(etat.opacite).toBeGreaterThan(0.3);
  });
});
