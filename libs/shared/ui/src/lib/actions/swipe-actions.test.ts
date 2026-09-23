import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { swipeActions } from './swipe-actions';

/**
 * Le garde-fou du clic, et son drapeau « le doigt a bougé ».
 *
 * Un balayage ne doit pas naviguer : le clic qui le suit est annulé en capture. Mais ce
 * drapeau appartient au **geste en cours** — s'il survit au geste, il annule des appuis
 * qui n'ont rien demandé, et le défaut est silencieux : la rangée ne fait simplement
 * rien, sans erreur ni trace.
 */
function rangee(avecActions: boolean): HTMLElement {
  const li = document.createElement('li');
  li.setAttribute('data-list-row', '');
  const couche = document.createElement('div');
  couche.setAttribute('data-swipe-layer', '');
  li.appendChild(couche);
  if (avecActions) {
    const piste = document.createElement('div');
    piste.setAttribute('data-swipe-track', '');
    piste.appendChild(document.createElement('button'));
    li.appendChild(piste);
  }
  const bouton = document.createElement('button');
  bouton.textContent = 'ouvrir';
  couche.appendChild(bouton);
  return li;
}

function pointer(type: string, cible: Element, x: number, y: number) {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(e, {
    isPrimary: { value: true },
    pointerId: { value: 1 }
  });
  cible.dispatchEvent(e);
}

describe('swipeActions — garde-fou du clic', () => {
  let liste: HTMLElement;
  let action: ReturnType<typeof swipeActions>;

  beforeEach(() => {
    liste = document.createElement('ul');
    document.body.appendChild(liste);
    // jsdom n'implémente pas la capture de pointeur.
    (liste as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
    (liste as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};
    (liste as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
    action = swipeActions(liste);
  });

  afterEach(() => {
    action.destroy();
    liste.remove();
  });

  it('laisse passer un appui sur une rangée sans action, après un balayage ailleurs', () => {
    /*
      `onPointerDown` sortait avant de rabaisser le drapeau quand la rangée n'a pas de
      piste d'actions — c'est le cas des réglages du hub de configuration. Le drapeau
      d'un geste précédent restait donc allumé, et **tous** les appuis suivants sur ces
      rangées-là étaient annulés, définitivement : seul un appui sur une rangée avec
      actions le rabaissait.
    */
    const avec = rangee(true);
    const sans = rangee(false);
    liste.appendChild(avec);
    liste.appendChild(sans);

    /*
      Un balayage interrompu : le doigt a bougé, puis le geste est annulé — un appel
      entrant, un `pointercancel` du navigateur. Aucun clic n'est produit, donc rien ne
      vient rabaisser le drapeau. C'est la forme qui laisse le défaut visible ; un
      balayage terminé normalement se solde par un clic qui, lui, le consomme.
    */
    const cibleAvec = avec.querySelector('button')!;
    pointer('pointerdown', cibleAvec, 200, 100);
    pointer('pointermove', cibleAvec, 150, 100);
    pointer('pointercancel', cibleAvec, 150, 100);

    // Puis un appui franc sur une rangée sans action.
    const cibleSans = sans.querySelector('button')!;
    let recu = 0;
    cibleSans.addEventListener('click', () => (recu += 1));

    pointer('pointerdown', cibleSans, 50, 300);
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    cibleSans.dispatchEvent(clic);

    expect(recu, "l'appui a été avalé par le garde-fou du balayage").toBe(1);
    expect(clic.defaultPrevented).toBe(false);
  });

  it('annule toujours le clic qui suit un vrai balayage', () => {
    // La raison d'être du garde-fou : un balayage ne navigue pas.
    const avec = rangee(true);
    liste.appendChild(avec);
    const cible = avec.querySelector('button')!;

    pointer('pointerdown', cible, 200, 100);
    pointer('pointermove', cible, 150, 100);

    let recu = 0;
    cible.addEventListener('click', () => (recu += 1));
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    cible.dispatchEvent(clic);

    expect(recu).toBe(0);
    expect(clic.defaultPrevented).toBe(true);
  });
});
