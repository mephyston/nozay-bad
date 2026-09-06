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

  it('liste les comptes du club en lecture seule, avec leur classe et leur nature', () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(AccountClassesConfig, {
      target,
      props: {
        accountClasses: [
          { code: '467', label: 'Autres comptes débiteurs ou créditeurs', type: 'tresorerie' },
          { code: '517', label: 'Autres placements et livrets', type: 'tresorerie' }
        ],
        accounts: [
          { id: 4, code: 'badnet', label: 'Porte-monnaie Badnet', classCode: '517', classType: 'tresorerie' },
          { id: 5, code: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', classCode: '467', classType: 'tresorerie' }
        ],
        isSubmitting: false,
        onCreateAccountClass: vi.fn().mockResolvedValue(true),
        onUpdateAccountClass: vi.fn().mockResolvedValue(true),
        onDeleteAccountClass: vi.fn().mockResolvedValue(true)
      }
    });
    flushSync();

    const section = target.querySelector('[data-testid="treasury-accounts"]')!;
    expect(section).not.toBeNull();
    const rows = Array.from(section.querySelectorAll('tbody tr')).map((r) => r.textContent ?? '');
    expect(rows).toHaveLength(2);
    // Le porte-monnaie est de la trésorerie ; le compte d'attente, une dette envers les adhérents.
    expect(rows[0]).toContain('Porte-monnaie Badnet');
    expect(rows[0]).toContain('517');
    expect(rows[0]).toContain('Disponibilités');
    expect(rows[1]).toContain('Fonds reçus pour le compte des adhérents');
    expect(rows[1]).toContain('467');
    expect(rows[1]).toContain('Tiers');
    // Aucun bouton : ces comptes se créent par migration, pas depuis l'écran.
    expect(section.querySelectorAll('button')).toHaveLength(0);
  });
});
