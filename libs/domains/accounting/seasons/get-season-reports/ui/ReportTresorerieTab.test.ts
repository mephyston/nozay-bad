import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import ReportTresorerieTab from './ReportTresorerieTab.svelte';

/**
 * Le compte d'attente des adhérents (classe 4) n'est pas de la trésorerie : il sort du tableau
 * et du « Total Général », et se lit à part comme une somme due, en positif.
 */
describe('ReportTresorerieTab', () => {
  let component: any;
  let target: HTMLDivElement;

  afterEach(() => {
    if (component) unmount(component);
    target?.remove();
  });

  const ligne = (over: Record<string, unknown>) => ({
    initialBalance: 0, finalBalance: 0, inVaultCents: 0, pendingDebitCents: 0,
    bankTheoreticalCents: 0, statementBalanceCents: null, statementDate: null, ...over
  });
  const texte = () => target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ');

  it("tient le compte d'attente hors du total et l'affiche comme une somme due", () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(ReportTresorerieTab, {
      target,
      props: {
        selectedSeason: '26-27',
        report: {
          compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: {} },
          bilanTrésorerie: [
            ligne({ accountId: 'current', label: 'Compte Courant', initialBalance: 100_000, finalBalance: 130_000 }),
            ligne({ accountId: 'badnet', label: 'Porte-monnaie Badnet', initialBalance: 40_000, finalBalance: 50_000 }),
            ligne({ accountId: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', thirdParty: true, finalBalance: -30_000 })
          ]
        } as any
      }
    });
    flushSync();

    // 130 000 + 50 000, sans les −30 000 du compte d'attente (qui donneraient 1 500,00).
    expect(texte()).toContain('1 800,00');
    expect(texte()).not.toContain('1 500,00');
    const bloc = target.querySelector('[data-testid="tiers-block"]')!;
    expect(bloc).not.toBeNull();
    expect(bloc.textContent).toContain('Sommes dues aux adhérents');
    expect(bloc.textContent!.replace(/[\u00a0\u202f]/g, ' ')).toContain('300,00');
    expect(bloc.textContent).not.toContain('-300');
  });

  it("n'affiche aucun bloc de tiers quand rien n'est dû", () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(ReportTresorerieTab, {
      target,
      props: {
        selectedSeason: '26-27',
        report: {
          compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: {} },
          bilanTrésorerie: [
            ligne({ accountId: 'current', label: 'Compte Courant', finalBalance: 1_000 }),
            ligne({ accountId: 'member_advances', label: 'Fonds reçus', thirdParty: true, finalBalance: 0 })
          ]
        } as any
      }
    });
    flushSync();

    expect(target.querySelector('[data-testid="tiers-block"]')).toBeNull();
    expect(target.textContent).not.toContain('Fonds reçus');
  });
});
