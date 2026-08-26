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

describe('le clavier', () => {
  const key = (k: string, target: EventTarget = window) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  const focusedId = (target: HTMLElement) =>
    (target.querySelector('[data-focused="true"]') as HTMLElement | null)?.getAttribute('data-line-id') ?? null;

  it('vise la première ligne, puis descend et remonte', () => {
    const target = render([line({ id: 1 }), line({ id: 2 }), line({ id: 3 })]);

    expect(focusedId(target)).toBe('1');

    key('ArrowDown'); flushSync();
    expect(focusedId(target)).toBe('2');

    key('ArrowUp'); flushSync();
    expect(focusedId(target)).toBe('1');
  });

  it('ne sort pas de la file par le haut ni par le bas', () => {
    const target = render([line({ id: 1 }), line({ id: 2 })]);

    key('ArrowUp'); flushSync();
    expect(focusedId(target)).toBe('1');

    key('ArrowDown'); key('ArrowDown'); key('ArrowDown'); flushSync();
    expect(focusedId(target)).toBe('2');
  });

  it('déplie la ligne visée avec « e »', () => {
    const target = render([line({ id: 1, name: 'PREMIERE' })]);

    key('e'); flushSync();
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(1);
  });

  /* Dans un formulaire, « i » est une lettre — pas un ordre. */
  it("n'exécute aucun raccourci sur une ligne dépliée", () => {
    const target = render([line({ id: 1 }), line({ id: 2 })]);

    key('e'); flushSync();
    key('ArrowDown'); flushSync();

    // Le curseur n'a pas bougé : la ligne ouverte a la main.
    expect(focusedId(target)).toBe('1');
  });

  it('referme la ligne dépliée avec Échap', () => {
    const target = render([line({ id: 1 })]);

    key('e'); flushSync();
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(1);

    key('Escape'); flushSync();
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(0);
  });

  it("n'exécute aucun raccourci pendant une saisie", () => {
    const target = render([line({ id: 1 }), line({ id: 2 })]);
    const input = target.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;

    key('ArrowDown', input); flushSync();
    expect(focusedId(target)).toBe('1');
  });

  it('ouvre la ligne visée quand Entrée ne peut rien valider', () => {
    const target = render([line({ id: 1 })]);

    key('Enter'); flushSync();
    expect(target.querySelectorAll('[data-action="expand"][title="Replier"]').length).toBe(1);
  });

  it('replie le curseur quand la file se raccourcit', async () => {
    const target = render([line({ id: 1, name: 'PREMIERE LIGNE' }), line({ id: 2, name: 'SECONDE LIGNE' })]);

    key('ArrowDown'); flushSync();
    expect(focusedId(target)).toBe('2');

    // On restreint la file à la première : le curseur ne peut pas rester au-delà.
    const input = target.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
    input.value = 'PREMIERE';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    await Promise.resolve();
    flushSync();

    expect(focusedId(target)).toBe('1');
  });
});

describe('le filtre par compte', () => {
  const multi = () => [
    line({ id: 1, accountId: 1, name: 'COURANT UN' }),
    line({ id: 2, accountId: 1, name: 'COURANT DEUX' }),
    line({ id: 3, accountId: 2, name: 'LIVRET UN' })
  ];

  const statements = [
    { account: { id: 1, code: 'current', label: 'Compte Courant' }, unpointedEntries: [], unrecordedBankLines: [], unpointedEntriesTotalCents: 0, unrecordedBankLinesTotalCents: 0 },
    { account: { id: 2, code: 'savings', label: 'Livret A' }, unpointedEntries: [], unrecordedBankLines: [], unpointedEntriesTotalCents: 0, unrecordedBankLinesTotalCents: 0 }
  ];

  /* Un seul compte : le filtre n'a rien à trancher, il n'encombre pas la barre. */
  it("ne s'affiche pas quand le relevé ne porte qu'un compte", () => {
    const target = render([line({ id: 1, accountId: 1 })], { reconciliationStatements: statements });

    expect(target.innerHTML).not.toContain('Tous les comptes');
  });

  /* Le combobox ne rend ses options qu'à l'ouverture : seul le libellé sélectionné est dans le
     DOM au repos. Le décompte par compte se vérifie sur l'état, dans `reconciliation.test.ts`. */
  it('propose le filtre, tous comptes par défaut', () => {
    const target = render(multi(), { reconciliationStatements: statements });

    expect(target.innerHTML).toContain('Tous les comptes (3)');
  });

  /*
    Sans repère de compte, on pointe sans savoir contre quel état de rapprochement on progresse :
    l'identité que vérifie l'état se pose compte par compte.
  */
  it('nomme le compte de chaque ligne tant que la file en mélange plusieurs', () => {
    const target = render(multi(), { reconciliationStatements: statements });

    const rowOf = (name: string) =>
      Array.from(target.querySelectorAll('[data-line-id]')).find((r) => r.textContent?.includes(name))!;

    expect(rowOf('COURANT UN').textContent).toContain('Compte Courant');
    expect(rowOf('LIVRET UN').textContent).toContain('Livret A');
  });

  it("ne répète pas le compte sur les lignes d'un relevé mono-compte", () => {
    const target = render([line({ id: 1, accountId: 1, name: 'SEULE' })], { reconciliationStatements: statements });

    const row = target.querySelector('[data-line-id]')!;
    expect(row.textContent).not.toContain('Compte Courant');
  });
});
