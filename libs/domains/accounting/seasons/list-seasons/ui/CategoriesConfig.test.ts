import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import CategoriesConfig from './CategoriesConfig.svelte';

/**
 * Le formulaire de création vit dans un Sheet et remonte sa saisie par une prop dont le nom
 * a changé le 28/07/2026 (`onCreateCategory` → `onSubmitCategory`) sans que l'appelant suive.
 * Le bouton « Créer la catégorie » appelait alors `undefined` : aucune erreur visible, aucune
 * catégorie créée. Ce test parcourt le vrai chemin, du bouton d'ouverture à la soumission.
 */
describe('CategoriesConfig — création', () => {
  const accountClasses = [
    { id: 1, code: '70', label: 'Ventes de produits et prestations', type: 'recette' as const },
    { id: 2, code: '62', label: 'Autres services extérieurs', type: 'depense' as const }
  ];

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

  it("transmet la saisie du Sheet à onCreateCategory et referme le Sheet", async () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    const onCreateCategory = vi.fn().mockResolvedValue(true);
    component = mount(CategoriesConfig, {
      target,
      props: {
        categories: [],
        accountClasses,
        isSubmitting: false,
        onCreateCategory,
        onUpdateCategory: vi.fn().mockResolvedValue(true),
        onDeleteCategory: vi.fn().mockResolvedValue(true)
      }
    });
    flushSync();

    const openButton = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Nouvelle catégorie')
    );
    expect(openButton).toBeDefined();
    openButton!.click();
    flushSync();

    setValue('new-cat-admin', 'Avances Badnet adhérents');
    setValue('new-cat-adherent', 'Inscriptions tournois (Badnet)');
    flushSync();

    const form = document.body.querySelector('#new-cat-admin')!.closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onCreateCategory).toHaveBeenCalledTimes(1));

    expect(onCreateCategory).toHaveBeenCalledWith(expect.objectContaining({
      adminLabel: 'Avances Badnet adhérents',
      adherentLabel: 'Inscriptions tournois (Badnet)',
      hideInExpenses: false,
      receiptCode: null,
      expenseCode: null
    }));

    await vi.waitFor(() => expect(document.body.querySelector('#new-cat-admin')).toBeNull());
  });

  it('laisse le Sheet ouvert quand le serveur refuse la création', async () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    const onCreateCategory = vi.fn().mockResolvedValue(false);
    component = mount(CategoriesConfig, {
      target,
      props: {
        categories: [],
        accountClasses,
        isSubmitting: false,
        onCreateCategory,
        onUpdateCategory: vi.fn().mockResolvedValue(true),
        onDeleteCategory: vi.fn().mockResolvedValue(true)
      }
    });
    flushSync();

    Array.from(target.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Nouvelle catégorie'))!
      .click();
    flushSync();

    setValue('new-cat-admin', 'Doublon');
    setValue('new-cat-adherent', 'Doublon');
    flushSync();

    document.body.querySelector('#new-cat-admin')!.closest('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onCreateCategory).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    flushSync();

    expect(document.body.querySelector('#new-cat-admin')).not.toBeNull();
  });
});
