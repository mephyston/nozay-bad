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
      line({ id: 3, status: 'reconciled' })
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

  /*
    L'écran s'ouvre sur un compte, jamais sur un mélange.

    « Tous les comptes » reste proposé, mais ne peut pas être le défaut : la file ne correspondrait
    alors à aucun des états de rapprochement affichés au-dessus. Le combobox ne rend ses options
    qu'à l'ouverture — seul le libellé sélectionné est dans le DOM au repos.
  */
  it('s\'ouvre sur le compte qui a le plus à traiter', () => {
    const target = render(multi(), { reconciliationStatements: statements });

    expect(target.innerHTML).toContain('Compte Courant (2)');
    expect(target.innerHTML).not.toContain('Tous les comptes');
    // Et la file se limite à ce compte.
    expect(target.innerHTML).toContain('COURANT UN');
    expect(target.innerHTML).not.toContain('LIVRET UN');
  });

  /*
    Le compte n'est rappelé sur les lignes que si la file en mélange plusieurs — c'est-à-dire
    seulement quand on a explicitement demandé « tous les comptes ». Filtrée, l'information serait
    répétée à chaque ligne pour rien.
  */
  it('ne nomme le compte des lignes que sur la vue tous comptes', () => {
    const target = render(multi(), { reconciliationStatements: statements });
    const rowOf = (name: string) =>
      Array.from(target.querySelectorAll('[data-line-id]')).find((r) => r.textContent?.includes(name))!;

    // Filtrée sur le Compte Courant : ses lignes ne le répètent pas.
    expect(rowOf('COURANT UN').textContent).not.toContain('Compte Courant');
  });

  it("ne répète pas le compte sur les lignes d'un relevé mono-compte", () => {
    const target = render([line({ id: 1, accountId: 1, name: 'SEULE' })], { reconciliationStatements: statements });

    const row = target.querySelector('[data-line-id]')!;
    expect(row.textContent).not.toContain('Compte Courant');
  });
});

/*
  Un doublon de recette a été créé sur 60,07 € : l'écran proposait « Valider » — qui crée une
  écriture — sur une ligne dont les livres portaient déjà l'opération. L'écriture d'origine est
  restée orpheline, le rapprochement a continué de boucler (une écriture non pointée passe pour un
  décalage de traitement), et le compte de résultat a compté la somme deux fois.
*/
describe("pointer avant créer", () => {
  const entry = (over: Record<string, any> = {}) => ({
    id: 900, type: 'recette', accountId: 1, amount: 6007, date: '2025-09-16',
    description: 'Licence Paul Madrange', bankStatementLineId: null, ...over
  });

  const bankLine = (over: Record<string, any> = {}) =>
    line({ id: 1, amount: 6007, date: '2025-09-15', name: 'VIR RECU 9525858309767', ...over });

  const withSuggestion = { aiSuggestions: JSON.stringify({ category: 5, memberId: 42, confidence: 0.9 }) };

  it("annonce l'écriture existante plutôt qu'une proposition de saisie", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [entry()] });

    expect(target.innerHTML).toContain('Une écriture existante correspond');
    expect(target.innerHTML).toContain('Licence Paul Madrange');
  });

  it("n'offre pas de valider une création quand une écriture attend d'être pointée", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [entry()] });

    expect(btn(target, 'Pointer')).not.toBeUndefined();
    expect(btn(target, 'Valider')).toBeUndefined();
  });

  it("laisse valider la suggestion quand rien n'existe dans les livres", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [] });

    expect(btn(target, 'Valider')).not.toBeUndefined();
    expect(btn(target, 'Pointer')).toBeUndefined();
  });

  /* Un montant identique mais hors de la fenêtre de sept jours n'est pas un candidat. */
  it("ignore une écriture trop éloignée dans le temps", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [entry({ date: '2025-11-30' })] });

    expect(btn(target, 'Valider')).not.toBeUndefined();
    expect(target.innerHTML).not.toContain('Une écriture existante correspond');
  });

  it("ignore une écriture déjà pointée sur une autre ligne", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [entry({ bankStatementLineId: 42 })] });

    expect(btn(target, 'Valider')).not.toBeUndefined();
  });

  it("ouvre la ligne sur l'onglet de pointage, et non sur la saisie", () => {
    const target = render([bankLine(withSuggestion)], { glTransactions: [entry()] });

    btn(target, 'Pointer').click();
    flushSync();

    // L'onglet « Pointer une écriture » est actif, et l'écriture candidate est listée.
    expect(target.innerHTML).toContain('Correspondances au même montant');
    expect(target.innerHTML).toContain('Licence Paul Madrange');
  });
});

describe("l'historique", () => {
  it("n'a qu'un contenu, et donc aucune bascule", () => {
    const target = render([line({ id: 1 }), line({ id: 2, status: 'reconciled' })]);

    btn(target, "Voir l'historique").click();
    flushSync();

    expect(target.innerHTML).toContain('DUPONT');
    expect(target.innerHTML).not.toContain('Masquées');
    expect(target.innerHTML).not.toContain('Rapprochées (');
  });

  /*
    Une ligne héritée du masquage revient dans la file, et non dans l'archive.

    La migration 0029 les rend toutes à l'état « en attente », mais l'écran ne doit pas en
    dépendre : le critère est « pas rapprochée », comme côté serveur. Sans cela, une telle
    ligne ne s'afficherait plus nulle part tout en continuant de peser dans l'écart — le
    défaut même pour lequel le masquage a été retiré.
  */
  it('ramène dans la file une ligne héritée du masquage', () => {
    const target = render([
      line({ id: 1, status: 'reconciled' }),
      line({ id: 2, status: 'ignored' as any, name: 'ANCIENNE MASQUEE' })
    ]);

    expect(target.innerHTML).toContain('1 opération à rapprocher');
    expect(target.innerHTML).toContain('ANCIENNE MASQUEE');
    expect(target.innerHTML).not.toContain('Masquées');
  });
});

/*
  En ventilation, catégorie et adhérent se décident part par part. Les laisser aussi en commun
  sous la ventilation en proposerait un second jeu, dont on ne saurait lequel l'emporte.
*/
describe('formulaire en ventilation', () => {
  const withMembers = {
    members: [{ id: 42, licence: '0102030', lastName: 'Dupont', firstName: 'Jean', amountRemaining: 0, seasonCode: '25-26' }],
    dbCategories: [{ id: 5, code: 'cotisations', adminLabel: 'Cotisations' }]
  };

  function expandAndSplit(target: HTMLElement) {
    (target.querySelector('[data-action="expand"]') as HTMLButtonElement).click();
    flushSync();
    const ventiler = btn(target, 'Ventiler');
    ventiler.click();
    flushSync();
  }

  it("masque l'adhérent et la catégorie communs une fois en ventilation", () => {
    const target = render([line({ id: 1 })], withMembers);

    expandAndSplit(target);

    expect(target.querySelector('#member-search-input')).toBeNull();
    expect(target.querySelector('#category-search-input')).toBeNull();
  });

  it('propose une catégorie et un adhérent par part', () => {
    const target = render([line({ id: 1 })], withMembers);

    expandAndSplit(target);

    expect(target.querySelector('#split-cat-0')).not.toBeNull();
    expect(target.querySelector('#split-member-0')).not.toBeNull();
  });

  /* La régularisation qualifie le rattachement de l'opération entière, pas de chaque part. */
  it('garde la régularisation en commun', () => {
    const target = render([line({ id: 1 })], withMembers);

    expandAndSplit(target);

    expect(target.querySelector('#accrual-type-input')).not.toBeNull();
  });
});

/*
  `ledger_entries.member_id` désigne une adhésion, pas une personne : la même personne en a une
  par saison, avec un identifiant différent. Proposer les deux annuaires laissait rattacher un
  encaissement à l'adhésion du mauvais exercice, sans qu'aucun contrôle ne le rattrape.
*/
describe("annuaire et exercice de rattachement", () => {
  const seasons = [
    { id: '25-26', code: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '26-27', code: '26-27', name: 'Saison 2026-2027', active: false }
  ];
  /* Chaque adhésion dit son exercice. L'absence de code ne signifie plus « exercice consulté » :
     cette convention muette rendait la liste vide, sans un mot, dès que l'exercice VISÉ n'était
     pas celui qu'on consultait — le cas d'une ligne d'août rapprochée depuis l'exercice suivant. */
  const members = [
    { id: 1, licence: '0102030', lastName: 'COURANTE', firstName: 'Anne', amountRemaining: 0, seasonCode: '25-26' },
    { id: 2, licence: '0405060', lastName: 'SUIVANTE', firstName: 'Bea', amountRemaining: 0, seasonCode: '26-27' }
  ];

  function openForm(target: HTMLElement) {
    (target.querySelector('[data-action="expand"]') as HTMLButtonElement).click();
    flushSync();
  }

  it("ne propose que l'annuaire de l'exercice visé, celui de la date par défaut", () => {
    const target = render([line({ id: 1 })], { seasons, members, seasonId: '25-26' });
    openForm(target);

    const input = target.querySelector('#member-search-input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus'));
    flushSync();

    expect(target.innerHTML).toContain('COURANTE');
    expect(target.innerHTML).not.toContain('SUIVANTE');
  });

  it("bascule sur l'annuaire de l'exercice visé", () => {
    const target = render([line({ id: 1 })], { seasons, members, seasonId: '25-26' });
    openForm(target);

    const season = target.querySelector('#target-season-input') as HTMLInputElement;
    season.dispatchEvent(new FocusEvent('focus'));
    flushSync();
    const option = Array.from(target.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent?.includes('2026-2027')
    ) as HTMLElement;
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    const input = target.querySelector('#member-search-input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus'));
    flushSync();

    expect(target.innerHTML).toContain('SUIVANTE');
    expect(target.innerHTML).not.toContain('COURANTE');
    /* Le millésime ne s'accole plus au nom : la liste ne mêle plus deux annuaires. */
    expect(target.innerHTML).not.toContain('SUIVANTE Bea (26-27)');
  });
});

/*
  L'exercice de rattachement ne se choisit plus : il se déduit de la date et du motif, exactement
  comme `validateAccrualAndFiscalPhase` l'impose. Les laisser indépendants offrait des
  combinaisons que le serveur refusait ensuite, sur une écriture déjà saisie.
*/
describe("exercice déduit du motif", () => {
  const seasons = [
    { id: '24-25', code: '24-25', name: 'Saison 2024-2025', active: false, startDate: '2024-09-01', endDate: '2025-08-31' },
    { id: '25-26', code: '25-26', name: 'Saison 2025-2026', active: true, startDate: '2025-09-01', endDate: '2026-08-31' },
    { id: '26-27', code: '26-27', name: 'Saison 2026-2027', active: false, startDate: '2026-09-01', endDate: '2027-08-31' }
  ];

  function openWith(accrual: string | null, over: Record<string, any> = {}) {
    const target = render(
      [line({ id: 1, date: '2026-08-20', amount: 15000, aiSuggestions: accrual ? JSON.stringify({ category: 5, accrualType: accrual, accrualNote: 'note', targetSeason: null }) : null })],
      { seasons, seasonId: '25-26', dbCategories: [{ id: 5, code: 'c', adminLabel: 'Cotisations' }], ...over }
    );
    (target.querySelector('[data-action="expand"]') as HTMLButtonElement).click();
    flushSync();
    return target;
  }

  const seasonField = (t: HTMLElement) => (t.querySelector('#target-season-input') as HTMLInputElement).value;

  it("rattache une écriture normale à l'exercice de sa date", () => {
    expect(seasonField(openWith(null))).toContain('2025-2026');
  });

  it("rattache un « constaté d'avance » à l'exercice suivant", () => {
    const target = openWith('produit_constate_avance');
    expect(seasonField(target)).toContain('2026-2027');
    expect(target.textContent).toContain("se rattache à l'exercice qui suit l'encaissement");
  });

  it("rattache un « à recevoir » à l'exercice précédent", () => {
    const target = openWith('produit_a_recevoir');
    expect(seasonField(target)).toContain('2024-2025');
    expect(target.textContent).toContain("se rattache à l'exercice déjà terminé");
  });

  /* Sans exercice voisin, on ne devine pas : on le dit. */
  it("signale l'absence d'exercice adéquat", () => {
    const target = render(
      [line({ id: 1, date: '2026-08-20', aiSuggestions: JSON.stringify({ category: 5, accrualType: 'produit_constate_avance', accrualNote: 'n' }) })],
      { seasons: seasons.slice(0, 2), seasonId: '25-26', dbCategories: [{ id: 5, code: 'c', adminLabel: 'Cotisations' }] }
    );
    (target.querySelector('[data-action="expand"]') as HTMLButtonElement).click();
    flushSync();

    expect(target.textContent).toContain('Aucun exercice ne convient à ce motif');
  });
});
