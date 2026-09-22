import { describe, it, expect, vi } from 'vitest';
import type { AccountEntry } from './account-types';
import { gestesDeMouvement, ligneDeCompte } from './account-row-model';

const COMPTES = [
  { id: 1, code: 'current', label: 'Compte courant' },
  { id: 2, code: 'cash', label: 'Caisse buvette' }
];

function mouvement(surcharges: Partial<AccountEntry> = {}): AccountEntry {
  return {
    id: 1,
    type: 'recette',
    date: '2026-09-12',
    description: 'Vente buvette',
    category: 'Buvette',
    amount: 2500,
    ...surcharges
  } as AccountEntry;
}

describe('account-row-model', () => {
  it('projette un mouvement : description, date, catégorie et montant signé', () => {
    expect(ligneDeCompte(mouvement())).toEqual({
      titre: 'Vente buvette',
      sousTitre: '2026-09-12 · Buvette',
      valeur: '+25,00 €',
      ton: 'success'
    });
  });

  it('signe une dépense du point de vue du compte affiché', () => {
    const l = ligneDeCompte(mouvement({ type: 'depense' }));
    expect(l.valeur).toBe('-25,00 €');
    expect(l.ton).toBe('destructive');
  });

  it("nomme l'autre bout d'un virement, et dit son sens", () => {
    /*
      Sans le sens, un virement reçu et un virement émis sont identiques à l'œil sur un
      compte : c'est la seule chose qui les distingue.
    */
    const recu = mouvement({ type: 'transfert', transferLeg: 'destination', counterpartAccountId: 1, category: null });
    expect(ligneDeCompte(recu, COMPTES).sousTitre).toBe('2026-09-12 · depuis Compte courant');
    expect(ligneDeCompte(recu, COMPTES).ton).toBe('success');

    const emis = mouvement({ type: 'transfert', transferLeg: 'source', counterpartAccountId: 1, category: null });
    expect(ligneDeCompte(emis, COMPTES).sousTitre).toBe('2026-09-12 · vers Compte courant');
    expect(ligneDeCompte(emis, COMPTES).ton).toBe('destructive');
  });

  it("dit « sans catégorie » plutôt que de laisser un vide", () => {
    expect(ligneDeCompte(mouvement({ category: null })).sousTitre).toBe('2026-09-12 · Sans catégorie');
  });

  it('met la modification en tête, et ne double pas la question de la suppression', () => {
    const actions = gestesDeMouvement(mouvement(), { onEdit: vi.fn(), onDelete: vi.fn() });
    expect(actions.map((a) => a.id)).toEqual(['modifier', 'supprimer']);
    /*
      L'écran pose déjà sa question, et elle dépend du mouvement : supprimer une jambe de
      virement efface les deux, sur les deux comptes. En poser une seconde, moins
      précise, ferait répondre deux fois.
    */
    expect(actions.every((a) => a.confirm === undefined)).toBe(true);
  });

  it('respecte les droits et la clôture', () => {
    const g = { onEdit: vi.fn(), onDelete: vi.fn() };
    expect(gestesDeMouvement(mouvement(), { ...g, isClosed: true })).toEqual([]);
    expect(gestesDeMouvement(mouvement(), { ...g, canWrite: false }).map((a) => a.id)).toEqual(['supprimer']);
    expect(gestesDeMouvement(mouvement(), { ...g, canDelete: false }).map((a) => a.id)).toEqual(['modifier']);
  });
});
