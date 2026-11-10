import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRawSnippet, mount, unmount, flushSync } from 'svelte';
import FormSheet from './FormSheet.svelte';

/** Bureau : le pied porte le bouton « Annuler » nommé. */
function poserBureau() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
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

const contenu = createRawSnippet(() => ({ render: () => '<p>Contenu</p>' }));

describe('FormSheet', () => {
  beforeEach(() => {
    poserBureau();
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never;
  });

  afterEach(async () => {
    document.body.innerHTML = '';
    // Le verrou de défilement de bits-ui se relâche en différé (cf. ResponsiveSheet.test.ts).
    await new Promise((r) => setTimeout(r, 50));
  });

  it('prévient l’écran quand on la referme par « Annuler »', () => {
    /*
      bits-ui n'appelle `onOpenChange` que pour ses propres fermetures. « Annuler »
      écrivait `open = false` sans le dire : l'écran des notes de frais gardait la note
      ouverte en mémoire, et aucune autre ne s'ouvrait ensuite.
    */
    const onOpenChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FormSheet, {
      target,
      props: { open: true, title: 'Modifier', onSubmit: () => {}, onOpenChange, children: contenu }
    });
    flushSync();

    const annuler = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Annuler');
    expect(annuler, 'le pied doit porter « Annuler »').toBeTruthy();
    annuler!.click();
    flushSync();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount(component);
  });
});
