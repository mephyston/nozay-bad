import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FieldProbe from './FieldHarness.svelte';

/** jsdom n'a pas `matchMedia` : c'est lui qui fait passer le champ en présentation téléphone. */
function poserTelephone() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false
    })
  });
}

function monter(props: { type?: string; value?: string }) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const component = mount(FieldProbe, { target, props });
  flushSync();
  const label = target.querySelector('label')!;
  const input = target.querySelector('input')!;
  return { component, label, input };
}

describe('Input au téléphone', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("un champ de texte prend l'intitulé comme invite", () => {
    poserTelephone();
    const { component, label, input } = monter({});
    expect(label.classList.contains('sr-only')).toBe(true);
    expect(input.placeholder).toBe('Places par créneau');
    unmount(component);
  });

  it.each(['number', 'date', 'time'])("un champ %s garde son intitulé visible : pré-rempli, il n'affiche aucune invite", (type) => {
    poserTelephone();
    const { component, label } = monter({ type, value: type === 'number' ? '2' : '' });
    expect(label.classList.contains('sr-only')).toBe(false);
    unmount(component);
  });
});
