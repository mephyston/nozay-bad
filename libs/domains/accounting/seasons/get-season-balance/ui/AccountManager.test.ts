import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import AccountManager from './AccountManager.svelte';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant', thirdParty: false },
  { id: 3, code: 'cash', label: 'Caisse Buvette', thirdParty: false },
  { id: 4, code: 'badnet', label: 'Porte-monnaie Badnet', thirdParty: false },
  { id: 5, code: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', thirdParty: true }
];
const SEASONS = [{ id: '25-26', name: 'Saison 2025-2026', active: true }];

const entry = (over: Record<string, any>) => ({
  id: 1, type: 'recette', accountId: 3, transferLeg: null, counterpartAccountId: null,
  category: 'Buvettes', amount: 5000, date: '2026-07-13', paymentMethod: 'especes',
  description: 'Vente boissons buvette', reference: null, ...over
});

describe('AccountManager', () => {
  let component: any;
  let target: HTMLDivElement;
  afterEach(() => {
    if (component) unmount(component);
    target?.remove();
  });

  const mountWith = (props: Record<string, any>) => {
    target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(AccountManager, {
      target,
      props: { account: ACCOUNTS[1], accounts: ACCOUNTS, seasonId: '25-26', seasons: SEASONS, initialBalance: 0, transactions: [], ...props }
    });
    flushSync();
    return target;
  };
  const html = () => target.innerHTML.replace(/&nbsp;|[  ]/g, ' ');

  it('calcule le solde de la caisse depuis les entrées et sorties', () => {
    mountWith({
      initialBalance: 10000,
      transactions: [entry({ id: 1 }), entry({ id: 2, type: 'depense', amount: 2000, description: 'Achat gobelets' })]
    });
    expect(html()).toContain('Solde · Caisse Buvette');
    // 100,00 + 50,00 − 20,00 = 130,00
    expect(html()).toContain('130,00');
    expect(html()).toContain('+50,00');
    expect(html()).toContain('-20,00');
    expect(html()).toContain('Achat gobelets');
  });

  it("ne compte pas deux fois une écriture datée avant l'ouverture : elle est déjà dans l'à-nouveau", () => {
    // Une inscription d'interclubs réglée le 20 août pour la saison suivante : rattachée à
    // 26-27, datée dans 25-26. L'à-nouveau de 26-27 (calculé par date) la contient déjà ;
    // le solde de l'écran doit retomber sur celui du grand livre : 808,00 − 60,00 = 748,00.
    mountWith({
      account: ACCOUNTS[2],
      seasonId: '26-27',
      seasons: [{ id: '26-27', name: 'Saison 2026-2027', active: true, startDate: '2026-09-01', endDate: '2027-08-31' }],
      initialBalance: 80_800,
      transactions: [
        entry({ id: 1, type: 'depense', amount: 17_500, date: '2026-08-20', description: 'ICR équipe 1 26-27' }),
        entry({ id: 2, type: 'transfert', transferLeg: 'source', counterpartAccountId: 1, amount: 6_000, date: '2026-09-06', description: 'Rendu' })
      ]
    });
    expect(html()).toContain('748,00');
    expect(html()).not.toContain('573,00');
    // L'écriture reste listée : c'est bien une pièce de cet exercice.
    expect(html()).toContain('ICR équipe 1 26-27');
  });

  it("compte un virement dans le sens de sa jambe, et nomme l'autre compte", () => {
    mountWith({
      initialBalance: 100_000,
      transactions: [entry({ id: 1, type: 'transfert', transferLeg: 'source', counterpartAccountId: 1, amount: 30_000, category: null, description: 'Dépôt des espèces en banque' })]
    });
    // 1 000,00 − 300,00 = 700,00
    expect(html()).toContain('700,00');
    expect(html()).toContain('-300,00');
    expect(html()).toContain('vers Compte Courant');
  });

  it('désactive la saisie et la suppression sur une saison clôturée', () => {
    mountWith({
      seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: false, closed: true }],
      transactions: [entry({ id: 1 })]
    });
    const newBtn = Array.from(target.querySelectorAll('button')).find((b) => /Nouveau/.test(b.textContent || ''));
    expect(newBtn?.hasAttribute('disabled')).toBe(true);
    expect(target.querySelector('button[aria-label="Supprimer"]')?.hasAttribute('disabled')).toBe(true);
  });

  it("montre le compte d'attente comme une dette positive, avec les avances en attente", () => {
    mountWith({
      account: ACCOUNTS[3],
      initialBalance: 0,
      transactions: [entry({ id: 1, type: 'transfert', accountId: 5, transferLeg: 'source', counterpartAccountId: 1, amount: 2500, category: null, description: 'Reçu de Mme Dupont', paymentMethod: 'virement_interne' })],
      memberAdvanceEntries: [entry({ id: 1, type: 'transfert', accountId: 5, transferLeg: 'source', counterpartAccountId: 1, amount: 2500, category: null, description: 'Reçu de Mme Dupont', paymentMethod: 'virement_interne' })]
    });
    // La carte de solde lit la dette en positif ; la ligne d'historique, elle, sort bien 25 € du compte.
    const carte = Array.from(target.querySelectorAll('h3')).find((h) => /Dû aux adhérents/.test(h.textContent || ''))?.closest('[data-slot="card"]');
    expect(carte).toBeDefined();
    const texteCarte = (carte?.textContent || '').replace(/[  ]/g, ' ');
    expect(texteCarte).toContain('25,00');
    expect(texteCarte).not.toContain('-25,00');
    const widget = target.querySelector('[data-testid="member-advances"]')!;
    expect(widget.textContent).toContain('Reçu de Mme Dupont');
    // Le crédit se propose ici comme sur l'écran Badnet : c'est le même virement.
    expect(widget.textContent).toContain('Créditer son Badnet');
  });

  it("propose sur l'écran Badnet le crédit d'une avance, pré-rempli", () => {
    mountWith({
      account: ACCOUNTS[2],
      initialBalance: 100_000,
      memberAdvanceEntries: [entry({ id: 9, type: 'transfert', accountId: 5, transferLeg: 'source', counterpartAccountId: 1, amount: 2500, category: null, description: 'Reçu de Mme Dupont', paymentMethod: 'virement_interne' })]
    });
    const widget = target.querySelector('[data-testid="member-advances"]')!;
    const refund = Array.from(widget.querySelectorAll('button')).find((b) => /Créditer son Badnet/.test(b.textContent || ''))!;
    expect(refund).toBeDefined();
    refund.click();
    flushSync();

    expect(document.body.textContent).toContain('Faire un virement interne');
    const description = document.body.querySelector('#description-input, input[placeholder*="Cotisation"]') as HTMLInputElement | null;
    const amount = document.body.querySelector('#amount-input') as HTMLInputElement;
    expect(amount.value).toBe('25.00');
    if (description) expect(description.value).toBe('Rendu à Mme Dupont');
  });

  it("rattache le crédit à l'exercice de sa date, même depuis l'écran de l'exercice écoulé", () => {
    // L'horloge des tests est figée au 30 août 2026 : le geste tombe dans 25-26, alors que
    // l'écran consulte 24-25, là où l'avance apparaît. Sans cela, la garde d'exercice refusait.
    mountWith({
      account: ACCOUNTS[2],
      seasonId: '24-25',
      seasons: [
        { id: 1, code: '24-25', name: 'Saison 2024-2025', active: false, startDate: '2024-09-01', endDate: '2025-08-31' },
        { id: 2, code: '25-26', name: 'Saison 2025-2026', active: true, startDate: '2025-09-01', endDate: '2026-08-31' }
      ],
      memberAdvanceEntries: [entry({ id: 9, type: 'transfert', accountId: 5, transferLeg: 'source', counterpartAccountId: 1, amount: 2500, category: null, description: 'Reçu de Mme Dupont', date: '2025-08-20', paymentMethod: 'virement_interne' })]
    });
    const widget = target.querySelector('[data-testid="member-advances"]')!;
    const refund = Array.from(widget.querySelectorAll('button')).find((b) => /Créditer son Badnet/.test(b.textContent || ''))!;
    refund.click();
    flushSync();

    // Le sélecteur de saison du formulaire affiche le libellé de l'exercice retenu.
    const selecteurs = Array.from(document.body.querySelectorAll('[role="combobox"]')).map((b) => b.textContent ?? '');
    expect(selecteurs.some((t) => t.includes('Saison 2025-2026'))).toBe(true);
    expect(selecteurs.some((t) => t.includes('Saison 2024-2025'))).toBe(false);
  });
});
