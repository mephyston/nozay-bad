import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MAINTIEN_MS, rangCible, reorderable } from './reorder';

/**
 * Cinq rangées de 60 px, la première commençant à 100 : centres 130, 190, 250, 310, 370.
 * C'est la géométrie que l'action mesure au `pointerdown`.
 */
const MILIEUX = [130, 190, 250, 310, 370];

describe('rangCible', () => {
  it('ne bouge pas tant qu’on n’a dépassé personne', () => {
    // On traîne la rangée 2 ; tant que son centre reste entre les milieux voisins,
    // elle garde son rang.
    expect(rangCible(250, MILIEUX, 2)).toBe(2);
    expect(rangCible(280, MILIEUX, 2)).toBe(2);
    expect(rangCible(220, MILIEUX, 2)).toBe(2);
  });

  it('descend d’un cran dès qu’on franchit le milieu de la suivante', () => {
    expect(rangCible(311, MILIEUX, 2)).toBe(3);
    expect(rangCible(371, MILIEUX, 2)).toBe(4);
  });

  it('monte d’un cran dès qu’on franchit le milieu de la précédente', () => {
    expect(rangCible(189, MILIEUX, 2)).toBe(1);
    expect(rangCible(129, MILIEUX, 2)).toBe(0);
  });

  it('s’arrête aux extrémités', () => {
    // Bien au-delà du bas : la dernière place, pas davantage.
    expect(rangCible(9999, MILIEUX, 2)).toBe(4);
    expect(rangCible(-9999, MILIEUX, 2)).toBe(0);
  });

  it('retient la place la plus haute atteinte en montant', () => {
    /*
      En montant, la première voisine franchie est la plus proche : sans l'arrêt, la
      boucle continuerait et la rangée retomberait au rang de la voisine suivante.
      C'est l'erreur qui ne lève rien — la ligne atterrit simplement un cran trop bas.
    */
    expect(rangCible(100, MILIEUX, 4)).toBe(0);
    expect(rangCible(200, MILIEUX, 4)).toBe(2);
  });

  it('traite une liste de deux, le cas le plus fréquent', () => {
    const deux = [130, 190];
    expect(rangCible(130, deux, 0)).toBe(0);
    expect(rangCible(191, deux, 0)).toBe(1);
    expect(rangCible(129, deux, 1)).toBe(0);
  });

  it('ne cale pas sur une liste d’un seul élément', () => {
    expect(rangCible(130, [130], 0)).toBe(0);
  });
});

/**
 * Le maintien, au doigt.
 *
 * Au doigt, un appui qui tient en place sur la rangée la soulève ; un doigt qui part
 * tout de suite fait défiler la page. Sans ce geste, un maintien sur la rangée ne
 * faisait que sélectionner son texte, et iOS proposait « Copier ».
 */
describe('reorderable — saisie par maintien', () => {
  let liste: HTMLElement;
  let action: { destroy(): void };
  let appels: [string, number, number][];

  function pointer(type: string, cible: Element, y: number, pointerType = 'touch', x = 10) {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperties(e, {
      isPrimary: { value: true },
      pointerId: { value: 1 },
      pointerType: { value: pointerType }
    });
    cible.dispatchEvent(e);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    liste = document.createElement('ul');
    // Trois rangées de 60 px empilées à partir de 100 : centres 130, 190, 250.
    for (let i = 0; i < 3; i += 1) {
      const li = document.createElement('li');
      li.dataset.reorderGroup = 'blocs';
      li.dataset.reorderIndex = String(i);
      li.textContent = `Bloc ${i + 1}`;
      li.getBoundingClientRect = () => ({ top: 100 + i * 60, height: 60 }) as DOMRect;
      liste.appendChild(li);
    }
    document.body.appendChild(liste);
    appels = [];
    action = reorderable(liste, { onReorder: (g, de, vers) => appels.push([g, de, vers]) });
    // La trame de dessin n'a pas d'importance ici : seul compte le rang au relâché.
    vi.stubGlobal('requestAnimationFrame', () => 1);
    // jsdom ne fournit pas `CSS.escape` ; les noms de groupe testés n'ont rien à échapper.
    if (!globalThis.CSS?.escape) vi.stubGlobal('CSS', { escape: (valeur: string) => valeur });
  });

  afterEach(() => {
    action.destroy();
    liste.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const rangees = () => Array.from(liste.querySelectorAll('li'));

  it('soulève la rangée après le maintien, et la dépose au relâché', () => {
    const [premiere] = rangees();
    pointer('pointerdown', premiere, 130);
    vi.advanceTimersByTime(MAINTIEN_MS);
    expect(premiere.hasAttribute('data-reorder-active')).toBe(true);

    pointer('pointermove', premiere, 200);
    pointer('pointerup', premiere, 200);

    expect(appels).toEqual([['blocs', 0, 1]]);
  });

  it('laisse défiler un doigt qui part avant la fin du maintien', () => {
    const [premiere] = rangees();
    pointer('pointerdown', premiere, 130);
    pointer('pointermove', premiere, 160);
    vi.advanceTimersByTime(MAINTIEN_MS);

    expect(premiere.hasAttribute('data-reorder-active')).toBe(false);
    pointer('pointerup', premiere, 200);
    expect(appels).toEqual([]);
  });

  it('ne saisit rien sur un appui bref', () => {
    const [premiere] = rangees();
    pointer('pointerdown', premiere, 130);
    pointer('pointerup', premiere, 130);
    vi.advanceTimersByTime(MAINTIEN_MS);

    expect(premiere.hasAttribute('data-reorder-active')).toBe(false);
  });

  it('retient le défilement une fois la rangée en main', () => {
    const [premiere] = rangees();
    pointer('pointerdown', premiere, 130);
    vi.advanceTimersByTime(MAINTIEN_MS);

    const mouvement = new Event('touchmove', { bubbles: true, cancelable: true });
    premiere.dispatchEvent(mouvement);
    expect(mouvement.defaultPrevented).toBe(true);
  });

  it('laisse la souris à la poignée', () => {
    const [premiere] = rangees();
    pointer('pointerdown', premiere, 130, 'mouse');
    vi.advanceTimersByTime(MAINTIEN_MS);

    expect(premiere.hasAttribute('data-reorder-active')).toBe(false);
  });
});
