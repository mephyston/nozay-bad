import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ChoicePicker from './ChoicePicker.svelte';

const OPTIONS = [
  { value: 'a', label: 'Actions jeunes' },
  { value: 'b', label: 'Tournoi' },
  { value: 'c', label: 'Divers' }
];

function monter(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(ChoicePicker, {
    target,
    props: { open: true, title: 'Catégories', options: OPTIONS, onChoose: () => {}, ...props }
  });
  flushSync();
  // Le contenu part dans un portail attaché au document, pas dans la cible de montage.
  return { target: document.body, component };
}

/** Les rangées d'options : les boutons du corps, sans celui du retour. */
const rangees = (target: HTMLElement) => Array.from(target.querySelectorAll('li button'));

const rangee = (target: HTMLElement, libelle: string) =>
  rangees(target).find((b) => b.textContent?.includes(libelle)) as HTMLButtonElement;

const coches = (target: HTMLElement) =>
  rangees(target)
    .filter((b) => b.querySelector('svg[aria-label="Choisi"]'))
    .map((b) => b.textContent?.trim().split('\n')[0]);

describe('ChoicePicker', () => {
  afterEach(async () => {
    document.body.innerHTML = '';
    /*
      bits-ui rend au `body` son style 24 ms après la fermeture — son verrou de
      défilement se relâche en différé. Sans cette attente, le minuteur se déclenche
      une fois jsdom démonté : « document is not defined », une exception non
      rattrapée qui fait sortir vitest en erreur alors que tous les tests passent.
      Invisible en local, où l'ordre des fichiers diffère ; la CI l'a vue.
    */
    await new Promise((r) => setTimeout(r, 50));
  });

  it('se ferme au premier appui quand il n’y a qu’une réponse', () => {
    const onChoose = vi.fn();
    const { target, component } = monter({ value: 'a', onChoose });

    rangee(target, 'Tournoi').click();
    flushSync();

    expect(onChoose).toHaveBeenCalledWith('b');
    /*
      Le nœud du dialogue survit à sa fermeture — il s'anime encore. Ce qui prouve la
      fermeture, c'est son état déclaré : le chercher absent donnait un test qui passait
      aussi bien sur un écran resté ouvert.
    */
    const dialogue = target.querySelector('[role="dialog"]');
    expect(dialogue?.getAttribute('data-state') ?? 'closed').toBe('closed');

    unmount(component);
  });

  it('reste ouvert en choix multiple, où l’on en coche souvent deux', () => {
    /*
      Se fermer au premier appui obligerait à rouvrir l'écran pour chaque catégorie —
      quatre navigations pour quatre rubriques. Le chevron de retour vaut « terminé ».
    */
    const onChoose = vi.fn();
    const { target, component } = monter({ multiple: true, values: ['a'], onChoose });

    rangee(target, 'Tournoi').click();
    flushSync();

    expect(onChoose).toHaveBeenCalledWith('b');
    /* Même sonde que la fermeture, et pour la même raison : compter les rangées
       laissait passer un écran fermé, dont le contenu reste un instant dans le DOM. */
    expect(target.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('open');

    unmount(component);
  });

  it('coche toutes les valeurs retenues, et elles seules', () => {
    const { target, component } = monter({ multiple: true, values: ['a', 'c'] });

    expect(coches(target)).toEqual(['Actions jeunes', 'Divers']);
    // L'état se dit aussi au lecteur d'écran, qu'une coche dessinée n'atteint pas.
    expect(rangee(target, 'Tournoi').getAttribute('aria-pressed')).toBe('false');
    expect(rangee(target, 'Divers').getAttribute('aria-pressed')).toBe('true');

    unmount(component);
  });

  it('n’annonce pas un état de bascule quand la réponse est unique', () => {
    const { target, component } = monter({ value: 'a' });

    expect(rangee(target, 'Actions jeunes').getAttribute('aria-pressed')).toBeNull();

    unmount(component);
  });

  it('cherche aussi dans la seconde ligne, comme le menu de la souris', () => {
    const { target, component } = monter({
      searchable: true,
      options: [
        { value: '1', label: 'ALLARD Léo', hint: 'Camille Allard' },
        { value: '2', label: 'DURAND Marie' }
      ]
    });
    const champ = target.querySelector('input') as HTMLInputElement;
    champ.value = 'camille';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    expect(rangees(target).map((b) => b.textContent)).toEqual([expect.stringContaining('ALLARD Léo')]);
    unmount(component);
  });
});

