import { describe, it, expect, vi } from 'vitest';
import type { Transaction } from './ledger-types';
import {
  actionsDEcriture,
  estVentilation,
  grouperVentilations,
  jourEtMois,
  libelleDeMois,
  ligneEcriture,
  moisDe,
  montantCents,
  montantSigneCents,
  signalement,
  tonDuMontant
} from './ledger-row-model';

const COMPTES = [
  { id: 1, code: 'current', label: 'Compte courant' },
  { id: 2, code: 'cash', label: 'Caisse' }
];

const CATEGORIES = [
  { id: '7', name: 'Cotisations' },
  { id: '12', name: 'Achats volants' }
];

function ecriture(surcharges: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    seasonId: '2',
    type: 'recette',
    accountId: 1,
    category: '7',
    amount: 5000,
    date: '2026-09-12',
    paymentMethod: 'virement',
    description: 'Cotisation Dupont',
    reference: null,
    ...surcharges
  } as Transaction;
}

describe('ledger-row-model', () => {
  it("signe le montant du point de vue du compte affiché, virements compris", () => {
    expect(montantSigneCents(ecriture({ type: 'recette' }))).toBe(5000);
    expect(montantSigneCents(ecriture({ type: 'depense' }))).toBe(-5000);
    // Sans le signe, un virement entrant et un virement sortant sont identiques à l'œil.
    expect(montantSigneCents(ecriture({ type: 'transfert', transferLeg: 'destination' }))).toBe(5000);
    expect(montantSigneCents(ecriture({ type: 'transfert', transferLeg: 'source' }))).toBe(-5000);
  });

  it('lit le montant sous ses deux formes de relais', () => {
    expect(montantCents(ecriture())).toBe(5000);
    expect(montantCents({ amount: 0, amountCents: 1234 } as never)).toBe(1234);
  });

  it('ne fait dire au ton que ce qui entre et ce qui sort', () => {
    expect(tonDuMontant(500)).toBe('success');
    expect(tonDuMontant(-500)).toBe('destructive');
    expect(tonDuMontant(0)).toBe('muted');
  });

  it('projette une recette : libellé, date et catégorie, montant signé, solde en légende', () => {
    const tx = ecriture({ runningBalanceCents: 123456 });
    expect(ligneEcriture(tx, { accounts: COMPTES, categories: CATEGORIES })).toEqual({
      titre: 'Cotisation Dupont',
      sousTitre: '12/09 · Cotisations',
      valeur: '+5 000,00 €'.replace('5 000', '50'),
      ton: 'success',
      legende: '1 234,56 €'
    });
  });

  it('nomme les deux bouts d’un virement dans le sens où il circule', () => {
    const emis = ecriture({ type: 'transfert', transferLeg: 'source', accountId: 1, counterpartAccountId: 2, category: null });
    expect(ligneEcriture(emis, { accounts: COMPTES }).sousTitre).toBe('12/09 · Compte courant → Caisse');

    const recu = ecriture({ type: 'transfert', transferLeg: 'destination', accountId: 1, counterpartAccountId: 2, category: null });
    expect(ligneEcriture(recu, { accounts: COMPTES }).sousTitre).toBe('12/09 · Caisse → Compte courant');
  });

  it('retire le solde progressif dès que la liste est filtrée', () => {
    const tx = ecriture({ runningBalanceCents: 123456 });
    expect(ligneEcriture(tx, { showBalance: false }).legende).toBeUndefined();
    expect(ligneEcriture(tx, { showBalance: true }).legende).toBe('1 234,56 €');
    // Une écriture sans solde calculé n'invente pas de légende.
    expect(ligneEcriture(ecriture()).legende).toBeUndefined();
  });

  it("dit « sans catégorie » plutôt que de laisser un tiret orphelin", () => {
    expect(ligneEcriture(ecriture({ category: null })).sousTitre).toBe('12/09 · Sans catégorie');
  });

  it('ne signale que ce qui demande une vérification', () => {
    // Le type est déjà dit par le signe du montant ; « rapprochée » est le cas courant.
    expect(signalement(ecriture(), '2')).toBeNull();
    expect(signalement(ecriture({ bankStatementLineId: 9 }), '2')).toBeNull();

    expect(signalement(ecriture({ accrualType: 'produit_constate_avance' }), '2')).toEqual({
      label: "Produit constaté d'avance",
      variant: 'warning'
    });
    expect(signalement(ecriture({ seasonId: '1' }), '2')).toEqual({
      label: 'Autre exercice',
      variant: 'secondary'
    });
    // Le rattachement prime : c'est une saisie à vérifier, l'autre n'est qu'un effet de filtre.
    expect(signalement(ecriture({ seasonId: '1', accrualType: 'charge_a_payer' }), '2')?.variant).toBe('warning');
  });

  it('signale une recette rendue, dont le montant rouge passerait sinon pour une erreur', () => {
    expect(signalement(ecriture({ amount: -10_000 }), '2')).toEqual({ label: 'Remboursement', variant: 'secondary' });
    expect(signalement(ecriture({ type: 'depense', amount: 10_000 }), '2')).toBeNull();
  });

  it('regroupe par mois et nomme les mois en français', () => {
    expect(moisDe('2026-09-12')).toBe('2026-09');
    // En minuscules : le nom sert au milieu d'une phrase (« Solde fin septembre 2026 »).
    expect(libelleDeMois('2026-09')).toBe('septembre 2026');
    expect(libelleDeMois('2026-01')).toBe('janvier 2026');
    expect(libelleDeMois('')).toBe('');
    expect(jourEtMois('2026-09-12')).toBe('12/09');
  });

  it('met l’action réversible en tête et fait porter sa question à la suppression', () => {
    const actions = actionsDEcriture(ecriture(), { onStartEdit: vi.fn(), onDelete: vi.fn() });
    expect(actions.map((a) => a.label)).toEqual(['Éditer', 'Supprimer']);
    expect(actions[0].tone).toBe('primary');
    expect(actions[1].tone).toBe('destructive');
    expect(actions[1].confirm).toContain('sans retour');
  });

  it("n'offre plus rien sur une saison clôturée", () => {
    expect(actionsDEcriture(ecriture(), { isClosed: true, onStartEdit: vi.fn(), onDelete: vi.fn() })).toEqual([]);
  });

  it('exécute la suppression sur l’identifiant de la ligne', () => {
    const onDelete = vi.fn();
    const actions = actionsDEcriture(ecriture({ id: 42 }), { onDelete });
    actions[0].run(ecriture({ id: 42 }));
    expect(onDelete).toHaveBeenCalledWith(42);
  });
  describe('grouperVentilations', () => {
    it('réunit les écritures consécutives d’une même ligne de relevé', () => {
      const lignes = grouperVentilations([
        ecriture({ id: 1, bankStatementLineId: 77, amount: 3000, runningBalanceCents: 10000 }),
        ecriture({ id: 2, bankStatementLineId: 77, amount: 2000 }),
        ecriture({ id: 3, description: 'Achat volants', type: 'depense', amount: 1500 })
      ]);

      expect(lignes).toHaveLength(2);
      const groupe = lignes[0];
      expect(estVentilation(groupe)).toBe(true);
      if (!estVentilation(groupe)) return;
      expect(groupe.children).toHaveLength(2);
      expect(groupe.amountCents).toBe(5000);
      expect(groupe.type).toBe('recette');
      // La liste descend dans le temps : le groupe porte le solde de sa première ligne.
      expect(groupe.runningBalanceCents).toBe(10000);
      expect(estVentilation(lignes[1])).toBe(false);
    });

    it("défait un groupe d'une seule ligne : ce n'est pas une ventilation", () => {
      const lignes = grouperVentilations([ecriture({ id: 1, bankStatementLineId: 77 })]);
      expect(lignes).toHaveLength(1);
      expect(estVentilation(lignes[0])).toBe(false);
    });

    it('sépare deux lignes de relevé différentes', () => {
      const lignes = grouperVentilations([
        ecriture({ id: 1, bankStatementLineId: 77 }),
        ecriture({ id: 2, bankStatementLineId: 77 }),
        ecriture({ id: 3, bankStatementLineId: 88 }),
        ecriture({ id: 4, bankStatementLineId: 88 })
      ]);
      expect(lignes).toHaveLength(2);
      expect(lignes.every(estVentilation)).toBe(true);
    });

    it('somme une ventilation de sens mêlés sur le montant net', () => {
      // Un remboursement porté sur la même ligne que l'encaissement : le groupe
      // affiche ce que la banque a vu, pas la somme des valeurs absolues.
      const lignes = grouperVentilations([
        ecriture({ id: 1, bankStatementLineId: 77, amount: 5000 }),
        ecriture({ id: 2, bankStatementLineId: 77, type: 'depense', amount: 1500 })
      ]);
      const groupe = lignes[0];
      expect(estVentilation(groupe)).toBe(true);
      if (!estVentilation(groupe)) return;
      expect(groupe.amountCents).toBe(3500);
      expect(groupe.type).toBe('recette');
    });
  });
});
