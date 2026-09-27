import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dragDetents } from './drag-detents';

/**
 * Qui a la main : le défilement du contenu, ou la feuille ?
 *
 * « Le défilement a souvent du mal dans les tiroirs » (pages, rapprochement) : la feuille
 * prenait des gestes qui revenaient au contenu. Ces tests fixent l'arbitrage.
 */
function pointer(type: string, cible: Element, x: number, y: number) {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(e, { isPrimary: { value: true }, pointerId: { value: 1 } });
  cible.dispatchEvent(e);
}

/** Un élément qui défile, à la position voulue. */
function defilant(el: HTMLElement, scrollTop: number) {
  el.style.overflowY = 'auto';
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
}

describe('dragDetents — arbitrage entre défilement et feuille', () => {
  let feuille: HTMLElement;
  let zone: HTMLElement;
  let liste: HTMLElement;
  let poignee: HTMLElement;
  let action: ReturnType<typeof dragDetents>;

  const tire = () => feuille.hasAttribute('data-sheet-dragging');
  const geste = (cible: Element, ...points: [number, number][]) => {
    pointer('pointerdown', cible, 100, 100);
    for (const [x, y] of points) pointer('pointermove', cible, x, y);
  };

  beforeEach(() => {
    feuille = document.createElement('div');
    poignee = document.createElement('div');
    poignee.setAttribute('data-grabber', '');
    zone = document.createElement('div');
    zone.setAttribute('data-sheet-scroll', '');
    liste = document.createElement('div');
    zone.appendChild(liste);
    feuille.appendChild(poignee);
    feuille.appendChild(zone);
    document.body.appendChild(feuille);
    Object.assign(feuille, { setPointerCapture: () => {}, releasePointerCapture: () => {}, hasPointerCapture: () => false });
    defilant(zone, 0);
    action = dragDetents(feuille, { detents: [0.5, 0.9], detent: 0 });
  });

  afterEach(() => {
    action.destroy();
    feuille.remove();
  });

  it('laisse remonter une liste intérieure, même quand la zone principale est en haut', () => {
    defilant(liste, 120);
    geste(liste, [100, 130], [100, 160]);
    expect(tire()).toBe(false);
  });

  it("ne prend pas la main sur un faux départ : le doigt roule vers le bas puis remonte", () => {
    geste(zone, [100, 108], [100, 60]);
    expect(tire()).toBe(false);
  });

  it('prend la main sur une vraie descente depuis le haut du contenu', () => {
    geste(zone, [100, 120], [100, 160]);
    expect(tire()).toBe(true);
  });

  it("n'est jamais tirée par un geste plutôt horizontal", () => {
    geste(zone, [140, 110], [200, 130]);
    expect(tire()).toBe(false);
  });

  it('suit la poignée dès les premiers pixels', () => {
    geste(poignee, [100, 108]);
    expect(tire()).toBe(true);
  });
});

/**
 * « Je choisis une catégorie, je sors du sélecteur, je ne peux plus défiler. »
 *
 * bits-ui réécrit tout l'attribut `style` du dialogue quand un sélecteur s'ouvre par-dessus :
 * la hauteur et la translation de la feuille disparaissaient, et son contenu, sans hauteur,
 * ne défilait plus. Reproduit en émulation iPhone le 27/09/2026, corrigé par un gardien.
 */
describe('dragDetents — styles effacés par la bibliothèque de dialogue', () => {
  it('repose sa hauteur et sa translation quand l’attribut style est réécrit', async () => {
    const feuille = document.createElement('div');
    document.body.appendChild(feuille);
    const action = dragDetents(feuille, { detents: [0.6, 0.95], detent: 0 });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const hauteur = feuille.style.height;
    expect(hauteur).not.toBe('');

    // Ce que fait bits-ui au passage de `--bits-dialog-nested-count` à 1.
    feuille.setAttribute('style', 'pointer-events: auto; --bits-dialog-nested-count: 1;');
    await Promise.resolve();

    expect(feuille.style.height).toBe(hauteur);
    expect(feuille.style.transform).toMatch(/^translate3d\(0(px)?, [0-9.]+px, 0(px)?\)$/);
    expect(feuille.style.getPropertyValue('--bits-dialog-nested-count').trim()).toBe('1');
    action.destroy();
    feuille.remove();
  });
});

