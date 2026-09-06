import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import AccountClassesConfig from './AccountClassesConfig.svelte';

/**
 * Même défaut que sur les catégories : le formulaire attend `onSubmitAccountClass`, l'appelant
 * passait `onCreateAccountClass`. Le bouton « Créer la classe » ne faisait rien.
 */
describe('AccountClassesConfig — création', () => {
  let component: any;
  let target: HTMLDivElement;

  afterEach(() => {
    if (component) unmount(component);
    target?.remove();
  });

  const setValue = (id: string, value: string) => {
    const input = document.body.querySelector(`#${id}`) as HTMLInputElement;
    expect(input, `champ #${id}`).not.toBeNull();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('transmet la saisie du Sheet à onCreateAccountClass et referme le Sheet', async () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    const onCreateAccountClass = vi.fn().mockResolvedValue(true);
    component = mount(AccountClassesConfig, {
      target,
      props: {
        accountClasses: [],
        isSubmitting: false,
        onCreateAccountClass,
        onUpdateAccountClass: vi.fn().mockResolvedValue(true),
        onDeleteAccountClass: vi.fn().mockResolvedValue(true)
      }
    });
    flushSync();

    const openButton = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Nouvelle classe')
    );
    expect(openButton).toBeDefined();
    openButton!.click();
    flushSync();

    setValue('new-class-code', '467');
    setValue('new-class-label', 'Autres comptes débiteurs ou créditeurs');
    flushSync();

    const form = document.body.querySelector('#new-class-code')!.closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onCreateAccountClass).toHaveBeenCalledTimes(1));

    expect(onCreateAccountClass).toHaveBeenCalledWith({
      code: '467',
      label: 'Autres comptes débiteurs ou créditeurs',
      type: 'recette'
    });

    await vi.waitFor(() => expect(document.body.querySelector('#new-class-code')).toBeNull());
  });
});
