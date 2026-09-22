import { describe, it, expect } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import TransactionLedger from './TransactionLedger.svelte';

describe('TransactionLedger Component', () => {
  it('renders balances, transaction list, and pagination correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 1,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: 'adhesions',
            amount: 4500, // 45.00 €
            date: '2026-07-13',
            paymentMethod: 'virement',
            description: 'Cotisation Martin',
            reference: 'VIR-9988'
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        seasonId: '25-26',
        balances: [
          { id: 1, accountId: 'current', label: 'Compte Courant', initialBalance: 100000, finalBalance: 104500 },
          { id: 2, accountId: 'savings', label: 'Livret A / Épargne', initialBalance: 200000, finalBalance: 200000 },
          { id: 3, accountId: 'cash', label: 'Caisse Buvette', initialBalance: 5000, finalBalance: 5000 }
        ],
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });

    expect(target.innerHTML).toContain('Journal des écritures');
    expect(target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ')).toContain('1 045,00'); // Compte Courant final balance
    expect(target.innerHTML).toContain('Cotisation Martin');
    expect(target.innerHTML).toContain('+45,00');
    expect(target.innerHTML).toContain('VIR-9988');

    unmount(component);
    document.body.removeChild(target);
  });

  it('renders outstanding checks toggle and intermediate pages in pagination', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [],
        pagination: {
          total: 100,
          page: 5,
          limit: 20,
          totalPages: 10
        },
        seasonId: '25-26',
        balances: [],
        seasons: [],
        categories: [],
        accountClasses: [],
        unreconciledChequesOnly: true
      }
    });

    // Pagination compacte : page courante active + bornes ; les pages
    // intermédiaires (2,3,7) sont remplacées par des ellipses.
    expect(target.innerHTML).toContain('Page 5 sur 10');
    const activeBtn = target.querySelector('[aria-current="page"]');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn?.textContent?.trim()).toBe('5');
    const pageLabels = Array.from(target.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(pageLabels).toContain('1');
    expect(pageLabels).toContain('10');

    // Le filtre "Chèques en circulation" est dans le menu "Filtres" ; comme
    // unreconciledChequesOnly=true, le bouton Filtres affiche son indicateur
    // de filtre actif (pastille).
    const filtresBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Filtres')) as HTMLButtonElement;
    expect(filtresBtn).toBeDefined();
    expect(filtresBtn.querySelector('span.rounded-full')).not.toBeNull();

    unmount(component);
    document.body.removeChild(target);
  });

  it('should render actions trigger and open edit/delete buttons inside Popover', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 1,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: '1',
            amount: 1500,
            date: '2026-07-16',
            paymentMethod: 'virement',
            description: 'Cotisation Test',
            reference: null
          }
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        seasonId: '25-26',
        balances: [],
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });
    flushSync();

    // Le menu d'actions de ligne (DataTableRowActions) : bouton icône avec
    // libellé accessible "Ouvrir le menu".
    const triggerBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Ouvrir le menu')
    ) as HTMLButtonElement;
    expect(triggerBtn).toBeDefined();

    // Cliquer sur le déclencheur pour ouvrir le Popover
    triggerBtn.click();
    flushSync();

    // Laisser le temps à Melt UI d'hydrater et positionner le popover
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Vérifier la présence des options
    expect(document.body.innerHTML).toContain('Éditer');
    expect(document.body.innerHTML).toContain('Supprimer');

    unmount(component);
    document.body.removeChild(target);
  });

  it('renders the account balance overview cards', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        seasonId: '25-26',
        balances: [
          { id: 1, accountId: 'current', label: 'Compte Courant', initialBalance: 0, finalBalance: 0 },
          { id: 2, accountId: 'savings', label: 'Livret A / Épargne', initialBalance: 0, finalBalance: 0 },
          { id: 3, accountId: 'cash', label: 'Caisse Buvette', initialBalance: 0, finalBalance: 0 },
          { id: 4, accountId: 'badnet', label: 'Porte-monnaie Badnet', initialBalance: 100000, finalBalance: 100000 },
          { id: 5, accountId: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', thirdParty: true, initialBalance: 0, finalBalance: -12000 }
        ],
        accountId: 'current'
      }
    });

    // Le filtrage par compte est désormais dans le menu "Filtres" ; les comptes restent
    // affichés en permanence dans la bande de trésorerie en tête — une pastille par ligne du
    // bilan, avec le libellé lu de la base, le porte-monnaie Badnet compris — et le total.
    const bande = target.querySelector('[data-testid="ledger-balances"]')!;
    const texte = () => (bande.textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
    expect(texte()).toContain('Compte Courant');
    expect(texte()).toContain('Livret A / Épargne');
    expect(texte()).toContain('Caisse Buvette');
    expect(texte()).toContain('Porte-monnaie Badnet');
    expect(texte()).toContain('1 000,00'); // les disponibilités : Badnet seul est garni
    // Le compte d'attente des adhérents se lit en dette positive, hors trésorerie.
    expect(texte()).toContain('Dû aux adhérents');
    expect(texte()).toContain('120,00');
    expect(texte()).not.toContain('-120,00');
    // Le détail (relevé, écart, chèques en coffre) est replié : le journal reste en vue.
    expect(bande.querySelectorAll('[data-slot="card"]').length).toBe(0);
    (bande.querySelector('button[aria-expanded]') as HTMLButtonElement).click();
    flushSync();
    expect(bande.querySelectorAll('[data-slot="card"]').length).toBe(5);

    unmount(component);
    document.body.removeChild(target);
  });

  it("affiche le rattachement d'exercice d'une écriture, et pas seulement dans son formulaire", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 2,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: 'adhesions',
            amount: 25000,
            date: '2026-08-21',
            paymentMethod: 'virement',
            description: 'VIR INST RE 673390599511',
            reference: null,
            accrualType: 'produit_constate_avance',
            accrualNote: 'Saison 26-27'
          }
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        seasonId: '25-26',
        balances: [{ accountId: 'current', initialBalance: 0, finalBalance: 25000 }],
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
      }
    });

    flushSync();
    expect(target.innerHTML).toContain("Produit constaté d'avance");
    expect(target.innerHTML).toContain('Saison 26-27');

    unmount(component);
    document.body.removeChild(target);
  });

  /*
   * Le solde progressif et les soldes de fin de mois ne valent que sur une liste
   * continue : une recherche ou un filtre en retire une partie, et un « solde fin
   * septembre » posé sur la dernière écriture trouvée mentirait.
   */
  const deuxMois = [
    { id: 1, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 4500, date: '2026-10-02', paymentMethod: 'virement', description: 'Cotisation Martin', reference: null, runningBalanceCents: 104500 },
    { id: 2, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 1000, date: '2026-09-20', paymentMethod: 'virement', description: 'Cotisation Durand', reference: null, runningBalanceCents: 100000 }
  ];
  const monter = (props: Record<string, unknown>) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(TransactionLedger, {
      target,
      props: { transactions: deuxMois, pagination: { total: 2, page: 1, limit: 20, totalPages: 1 }, seasonId: '25-26', balances: [], seasons: [], ...props }
    });
    flushSync();
    return { target, component };
  };

  it('montre le solde et le repère de fin de mois sur la liste complète', () => {
    const { target, component } = monter({});
    expect(target.textContent).toContain('Solde fin septembre 2026');
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).toContain('1 045,00');
    unmount(component);
    target.remove();
  });

  it('cache le solde et les repères de fin de mois dès que la liste est filtrée', () => {
    const { target, component } = monter({ searchQuery: 'Martin' });
    expect(target.textContent).not.toContain('Solde fin septembre 2026');
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).not.toContain('1 045,00');
    // Les écritures, elles, restent.
    expect(target.textContent).toContain('Cotisation Martin');
    unmount(component);
    target.remove();
  });

  it("garde le solde sur un filtre par mois : la liste reste continue", () => {
    const { target, component } = monter({ month: '2026-09' });
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).toContain('1 045,00');
    unmount(component);
    target.remove();
  });
  /*
    La vue au doigt. Elle est rendue en même temps que la table — c'est la feuille de
    style qui choisit —, donc interrogeable ici : les rangées portent `data-list-row`,
    les en-têtes de section le mois et son solde de clôture, et les actions révélables
    vivent dans `[data-swipe-track]`.
  */
  const sansEspacesInsecables = (t: string | null) => (t ?? '').replace(/[\u00a0\u202f]/g, ' ');

  const libellesDeBalayage = (target: HTMLElement, rang = 0) => {
    const pistes = Array.from(target.querySelectorAll('[data-swipe-track]'));
    if (pistes.length <= rang) return [];
    return Array.from(pistes[rang].querySelectorAll('button')).map((b) => (b.textContent || '').trim());
  };

  it('groupe les écritures par mois et porte le solde de clôture en en-tête', () => {
    const { target, component } = monter({});

    const enTetes = Array.from(target.querySelectorAll('h3')).map((h) => sansEspacesInsecables(h.textContent));
    // La liste descend dans le temps : octobre d'abord, et chaque mois porte le solde
    // de sa ligne la plus récente — sa clôture.
    expect(enTetes.some((t) => /octobre 2026/i.test(t) && t.includes('1 045,00'))).toBe(true);
    expect(enTetes.some((t) => /septembre 2026/i.test(t) && t.includes('1 000,00'))).toBe(true);

    unmount(component);
    target.remove();
  });

  it('retire le solde des en-têtes dès que la liste est filtrée', () => {
    const { target, component } = monter({ searchQuery: 'Martin' });
    const enTetes = Array.from(target.querySelectorAll('h3')).map((h) => sansEspacesInsecables(h.textContent));
    expect(enTetes.some((t) => /octobre 2026/i.test(t))).toBe(true);
    expect(enTetes.some((t) => t.includes('1 045,00'))).toBe(false);
    /*
      À la place du solde, le compte — mais avec son unité. Un nombre nu à cet endroit
      se lirait comme une somme, puisque c'en est une le reste du temps.
    */
    expect(enTetes.some((t) => /octobre 2026 1 écriture$/i.test(t))).toBe(true);
    unmount(component);
    target.remove();
  });

  it('projette une écriture en une rangée : libellé, date, catégorie, montant signé, solde', () => {
    const { target, component } = monter({});

    const rangees = Array.from(target.querySelectorAll('[data-list-row]'));
    expect(rangees.length).toBeGreaterThan(0);
    const texte = sansEspacesInsecables(rangees[0].textContent);
    expect(texte).toContain('Cotisation Martin');
    expect(texte).toContain('02/10 · adhesions');
    expect(texte).toContain('+45,00');
    expect(texte).toContain('1 045,00');

    // La cible du retour depuis le rapprochement.
    expect(target.querySelector('#tx-mobile-1')).not.toBeNull();

    unmount(component);
    target.remove();
  });

  it('révèle au balayage l’édition puis la suppression, la réversible en tête', () => {
    const { target, component } = monter({});
    expect(libellesDeBalayage(target)).toEqual(['Éditer', 'Supprimer']);
    unmount(component);
    target.remove();
  });

  it("n'offre plus rien au balayage sur une saison clôturée", () => {
    const { target, component } = monter({
      seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true, closed: true }]
    });
    expect(libellesDeBalayage(target)).toEqual([]);
    unmount(component);
    target.remove();
  });

  it('replie une opération ventilée au lieu d’aligner ses lignes', () => {
    const ventilee = [
      { id: 10, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 3000, date: '2026-10-02', paymentMethod: 'virement', description: 'Part cotisation', reference: null, bankStatementLineId: 77, runningBalanceCents: 105000 },
      { id: 11, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 2000, date: '2026-10-02', paymentMethod: 'virement', description: 'Part boutique', reference: null, bankStatementLineId: 77 }
    ];
    const { target, component } = monter({ transactions: ventilee });

    const texte = sansEspacesInsecables(target.textContent);
    expect(texte).toContain('Opération ventilée');
    expect(texte).toContain('2 lignes');
    // Repliée par défaut : les deux lignes filles ne sont pas encore à l'écran.
    expect(target.querySelectorAll('[data-list-row]').length).toBe(1);

    const replier = target.querySelector('[data-list-row] button[aria-label="Déplier"]') as HTMLButtonElement;
    expect(replier, 'le groupe doit porter un chevron de repli').not.toBeNull();
    replier.click();
    flushSync();
    expect(target.querySelectorAll('[data-list-row]').length).toBe(3);

    unmount(component);
    target.remove();
  });
});
