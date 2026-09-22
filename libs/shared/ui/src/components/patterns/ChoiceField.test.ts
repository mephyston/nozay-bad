import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ChoiceField from './ChoiceField.svelte';

/**
 * jsdom n'implémente pas `matchMedia` : on le pose nous-mêmes, et c'est lui qui décide
 * laquelle des deux présentations le champ rend. Sans ce stub, `creerIsMobile` répond
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

const OPTIONS = [
  { value: 'tous', label: 'Tous les créneaux' },
  { value: 'masques', label: 'Masqués' }
];

function monter(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(ChoiceField, {
    target,
    props: { id: 'filter-visibilite', label: 'Affichage', options: OPTIONS, value: 'tous', ...props }
  });
  flushSync();
  return { target, component };
}

describe('ChoiceField', () => {
  afterEach(async () => {
    document.body.innerHTML = '';
    await new Promise((r) => setTimeout(r, 50));
  });

  it('garde l’identifiant que l’écran lui donne, sur téléphone', () => {
    /*
      bits-ui pose le sien dans les propriétés du déclencheur. Étalées après `{id}`,
      elles l'écrasaient : le champ s'appelait « bits-c101 », le `<label for=…>` du
      bloc ne désignait plus rien, et l'intitulé cessait d'être lu.
    */
    poserLargeur(true);
    const { target, component } = monter();

    expect(target.querySelector('#filter-visibilite')).not.toBeNull();

    unmount(component);
  });

  it('garde le même identifiant à la souris', () => {
    poserLargeur(false);
    const { target, component } = monter();

    expect(target.querySelector('#filter-visibilite')).not.toBeNull();

    unmount(component);
  });

  it('affiche l’option retenue, et l’invite à défaut', () => {
    poserLargeur(true);
    const { target, component } = monter({ value: 'masques' });
    expect(target.textContent).toContain('Masqués');
    unmount(component);

    const vide = monter({ value: '', placeholder: 'Choisir…' });
    expect(vide.target.textContent).toContain('Choisir…');
    unmount(vide.component);
  });
});
