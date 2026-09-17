import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ImportResultDialog from './ImportResultDialog.svelte';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('astro:transitions/client', () => ({ navigate }));

const montes: unknown[] = [];

/*
 * Le dialogue est rendu dans un portail : on lit `document.body`, pas la cible de montage.
 */
function mounted(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  montes.push(mount(ImportResultDialog, { target, props: { open: true, ...props } }));
  flushSync();
  return () => document.body.querySelector('[data-import-result]');
}

describe('ImportResultDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    navigate.mockClear();
  });

  // Un dialogue ouvert verrouille le défilement du corps ; bits-ui ne rend son style
  // d'origine que 24 ms après la libération du verrou (`scheduleCleanupIfNoNewLocks`).
  // Sans démontage ni attente, ce minuteur se réveille une fois jsdom démonté et lève
  // « document is not defined » — une erreur non rattrapée qui fait échouer toute la
  // suite alors que les tests, eux, passent. Vue seulement sur machine lente : la CI
  // l'a rencontrée deux fois quand le pre-push local ne la voyait jamais.
  afterEach(async () => {
    for (const instance of montes.splice(0)) await unmount(instance as never);
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 50));
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
