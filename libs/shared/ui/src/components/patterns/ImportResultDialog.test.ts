import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ImportResultDialog from './ImportResultDialog.svelte';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('astro:transitions/client', () => ({ navigate }));

/*
 * Le dialogue est rendu dans un portail : on lit `document.body`, pas la cible de montage.
 */
function mounted(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(ImportResultDialog, { target, props: { open: true, ...props } });
  flushSync();
  return () => document.body.querySelector('[data-import-result]');
}

describe('ImportResultDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    navigate.mockClear();
  });

  it("en succès, « Continuer » mène là où le résultat se lit", () => {
    const dialog = mounted({ success: true, title: 'Import terminé', message: '3 créations.', continueHref: '/admin/members', continueLabel: 'Voir les adhérents' });
    expect(dialog()?.getAttribute('data-import-result')).toBe('success');
    expect(dialog()?.textContent).toContain('3 créations.');

    const bouton = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Voir les adhérents'));
    expect(bouton).toBeDefined();
    bouton!.click();
    flushSync();

    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/admin/members'), undefined);
  });

  it("en échec, « OK » ferme sans quitter l'écran : le formulaire reste là pour réessayer", () => {
    const dialog = mounted({ success: false, title: "L'import a échoué", message: 'Fichier illisible.', continueHref: '/admin/members' });
    expect(dialog()?.getAttribute('data-import-result')).toBe('failure');

    const bouton = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'OK');
    expect(bouton).toBeDefined();
    bouton!.click();
    flushSync();

    expect(navigate).not.toHaveBeenCalled();
  });
});
