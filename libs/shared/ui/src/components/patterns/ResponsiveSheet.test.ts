import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRawSnippet, mount, unmount, flushSync } from 'svelte';
import ResponsiveSheet from './ResponsiveSheet.svelte';

/**
 * jsdom n'implémente pas `matchMedia` : on le pose nous-mêmes, et c'est lui qui décide
 * laquelle des deux présentations la feuille rend. Sans ce stub, `creerIsMobile` répond
 * « bureau » et la branche téléphone — celle qui nous intéresse ici — n'est jamais jouée.
 */
function poserLargeur(mobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: mobile,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    })
  });
}

/** La feuille exige un contenu ; le sien n'importe pas ici. */
const contenu = createRawSnippet(() => ({ render: () => '<p>Contenu</p>' }));

function monter(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(ResponsiveSheet, {
    target,
    props: { open: true, title: 'Une décision', portalProps: { to: target }, children: contenu, ...props }
  });
  flushSync();
  return { target, component };
}

const fermetures = (target: HTMLElement) =>
  Array.from(target.querySelectorAll('button')).filter((b) =>
    /Fermer/i.test(b.getAttribute('aria-label') ?? b.textContent ?? '')
  );

describe('ResponsiveSheet', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never;
  });

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

  it('porte une sortie visible sur téléphone, où il n’y en avait aucune', () => {
    /*
      Le bouton de fermeture n'était rendu qu'au-dessus de 768 px. Au doigt, il ne restait
      que le geste vers le bas et le voile — or une feuille montée à 95 % de l'écran ne
      laisse presque pas de voile, et un contenu défilant capte le glissement. On s'y
      retrouvait enfermé, ce qui s'est vu sur la fiche de décision du rapprochement.
    */
    poserLargeur(true);
    const { target, component } = monter({});

    expect(fermetures(target).length, 'une feuille mobile doit offrir une fermeture').toBe(1);

    unmount(component);
  });

  it('laisse sa place à la sortie que l’écran fournit lui-même', () => {
    /*
      Un formulaire pose sa propre croix à gauche — elle annule la saisie, ce qu'une
      fermeture générique ne dit pas. La feuille ne doit pas en ajouter une seconde.
    */
    poserLargeur(true);
    const { target, component } = monter({ showCloseButton: false });

    expect(fermetures(target).length).toBe(0);

    unmount(component);
  });

  it('garde sa croix en coin au-dessus de 768 px', () => {
    poserLargeur(false);
    const { target, component } = monter({});

    expect(fermetures(target).length).toBe(1);

    unmount(component);
  });
});
