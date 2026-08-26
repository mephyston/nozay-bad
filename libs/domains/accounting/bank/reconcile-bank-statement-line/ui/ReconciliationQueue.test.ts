import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BankStatementReconciliation from './BankStatementReconciliation.svelte';

let component: any = null;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  document.body.innerHTML = '';
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: [] })
  } as Response);
});

afterEach(() => {
  if (component) { unmount(component); component = null; }
  document.body.innerHTML = '';
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const line = (over: Record<string, any> = {}) => ({
  id: 1, fitid: 'F1', accountId: 'current', amount: 15000, date: '2026-02-16',
  name: 'VIR DUPONT JEAN', memo: null, status: 'pending', aiSuggestions: null, ...over
});

function render(lines: any[], props: Record<string, any> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  component = mount(BankStatementReconciliation, {
    target,
    props: {
      bankStatementLines: lines,
      glTransactions: [],
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
      members: [],
      dbCategories: [{ id: 5, code: 'cotisations', adminLabel: 'Cotisations' }],
      ...props
    }
  });
  flushSync();
  return target;
}

const btn = (target: HTMLElement, text: string) =>
  Array.from(target.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('la file de décisions', () => {
  it('annonce ce qui reste à faire, et la progression', () => {
    const target = render([
      line({ id: 1 }),
      line({ id: 2, status: 'reconciled' }),
      line({ id: 3, status: 'ignored' })
    ]);

    expect(target.innerHTML).toContain('1 opération à rapprocher');
    expect(target.innerHTML).toContain('2 sur 3 traitée');
  });

  /*
    Les trois onglets mettaient sur le même plan une file à vider et deux archives. L'écran de
    travail ne montre plus que ce qui reste à décider.
  */
  it("ne montre pas les lignes traitées dans la file", () => {
    const target = render([
      line({ id: 1, name: 'EN ATTENTE' }),
      line({ id: 2, name: 'DEJA RAPPROCHEE', status: 'reconciled' })
    ]);

    expect(target.innerHTML).toContain('EN ATTENTE');
    expect(target.innerHTML).not.toContain('DEJA RAPPROCHEE');
  });

  it("montre les lignes traitées dans l'historique", () => {
    const target = render([
      line({ id: 1, name: 'EN ATTENTE' }),
      line({ id: 2, name: 'DEJA RAPPROCHEE', status: 'reconciled' })
    ]);

    btn(target, "Voir l'historique").click();
    flushSync();

    expect(target.innerHTML).toContain('DEJA RAPPROCHEE');
    expect(target.innerHTML).not.toContain('EN ATTENTE');
  });

  it('célèbre une file vide plutôt que de montrer un tableau vide', () => {
    const target = render([line({ id: 1, status: 'reconciled' })]);

    expect(target.innerHTML).toContain('La file est vide.');
  });

  /*
    Le geste courant tient en un clic : la ligne portant une proposition applicable se valide sans
    ouvrir quoi que ce soit.
  */
  it('offre un bouton Valider sur une proposition applicable', () => {
    const target = render([line({ aiSuggestions: JSON.stringify({ category: 5, memberId: 42, confidence: 0.92 }) })]);

    expect(target.innerHTML).toContain('Cotisations');
    expect(target.innerHTML).toContain('92 %');
    expect(btn(target, 'Valider')).not.toBeUndefined();
  });

  it("n'offre aucune validation directe sans proposition", () => {
    const target = render([line()]);

    expect(target.innerHTML).toContain('Aucune proposition — à saisir');
    expect(btn(target, 'Valider')).toBeUndefined();
  });

  /*
    Un virement interne s'écrit en deux jambes, une par compte : cet écran n'en produit qu'une.
    Il ne doit donc jamais proposer de le valider d'un clic.
  */
  it('refuse la validation directe sur un virement interne', () => {
    const target = render([line({ aiSuggestions: JSON.stringify({ kind: 'internal-transfer', category: 5 }) })]);

    expect(target.innerHTML).toContain('Virement interne');
    expect(btn(target, 'Valider')).toBeUndefined();
  });

  it("n'ouvre qu'une ligne à la fois", () => {
    const target = render([line({ id: 1, name: 'PREMIERE' }), line({ id: 2, name: 'SECONDE' })]);

    const expandOf = (name: string) =>
      (Array.from(target.querySelectorAll('[data-line-id]')).find((r) => r.textContent?.includes(name)) as HTMLElement)
        .querySelector('[data-action="expand"]') as HTMLButtonElement;

    expandOf('PREMIERE').click();
    flushSync();
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(1);

    expandOf('SECONDE').click();
    flushSync();
    // La première s'est refermée : un seul jeu de comboboxes reste monté.
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(1);
  });
});
