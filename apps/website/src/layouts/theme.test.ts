import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Un seul système de thème, et un seul.
 *
 * Le layout en a porté deux : le script du site, sur la clé `theme`, et un reliquat de
 * `mode-watcher` sur la clé `mode-watcher-mode`. Le second s'exécutait après le
 * premier et ne savait qu'**ajouter** la classe `dark`, jamais la retirer : le choix
 * explicite du visiteur était donc écrasé à chaque page par la préférence du système.
 *
 * Le défaut ne se voyait ni au typage, ni au build, ni à l'œil sur une machine réglée
 * en clair. D'où ce contrôle sur le texte du layout, faute de pouvoir exécuter un
 * script en ligne d'Astro dans un test.
 */
const LAYOUT = fs.readFileSync(path.join(__dirname, 'BaseLayout.astro'), 'utf-8');

describe('amorçage du thème', () => {
  it("ne lit qu'une seule clé de préférence", () => {
    const keys = [...LAYOUT.matchAll(/localStorage\.getItem\('([^']+)'\)/g)].map((m) => m[1]);
    expect(keys).toEqual(['theme']);
  });

  it('ne réintroduit pas mode-watcher, que rien ne pilote sur le site public', () => {
    // C'était aussi la seule île cliente de tout le site : la retirer a supprimé le
    // dernier composant à hydrater d'une page publique.
    expect(LAYOUT).not.toContain('mode-watcher');
    expect(LAYOUT).not.toContain('ModeWatcher');
  });

  it('retire la classe autant qu’il la pose', () => {
    // `classList.add` conditionnel laisserait un thème sombre en place au retour au
    // clair. Seul `toggle(..., booléen)` fait les deux.
    expect(LAYOUT).toContain("classList.toggle('dark', dark)");
    expect(LAYOUT).not.toMatch(/classList\.add\('dark'\)/);
  });

  it('accorde aussi les éléments natifs', () => {
    expect(LAYOUT).toContain('colorScheme');
  });
});
