import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import AmountInput from './AmountInput.svelte';

/**
 * Le champ ne retient un montant qu'à la sortie du champ, et ne doit surtout pas effacer ce
 * qu'on y tape entre-temps. L'effet de synchronisation d'origine comparait le texte au nombre
 * à chaque frappe et remettait l'ancien nombre : impossible de saisir un montant différent.
 */
describe('AmountInput', () => {
  let component: any;
  let target: HTMLDivElement;

  afterEach(() => {
    if (component) unmount(component);
    target?.remove();
  });

  const type = (input: HTMLInputElement, text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  };

  it('garde le texte tapé, puis retient le nombre à la sortie du champ', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state({ value: 0 });
    component = mount(AmountInput, { target, props });
    flushSync();

    const input = target.querySelector('input') as HTMLInputElement;
    expect(input.value.replace(/\s/g, '')).toBe('0,00');

    type(input, '1000');
    expect(input.value).toBe('1000');
    expect(props.value).toBe(0);

    input.dispatchEvent(new Event('blur'));
    flushSync();
    expect(props.value).toBe(1000);
    expect(input.value.replace(/[\s  ]/g, '')).toBe('1000,00');
  });

  it("se resynchronise quand la valeur change de l'extérieur", () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state({ value: 12.5 });
    component = mount(AmountInput, { target, props });
    flushSync();

    const input = target.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('12,50');

    props.value = 242.9;
    flushSync();
    expect(input.value).toBe('242,90');
  });
});
