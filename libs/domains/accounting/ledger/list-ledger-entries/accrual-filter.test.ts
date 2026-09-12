import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import { seasonsTable, ledgerEntriesTable, categoriesTable } from '../../shared/schema';
import { listLedgerEntries } from './handler';

/**
 * Filtrer le grand livre par motif de régularisation.
 *
 * L'encart « Régularisations comptables » du compte de résultat renvoie vers le grand livre
 * pour montrer les écritures qu'il résume : celles-ci se rattachent à l'exercice **suivant**
 * (un produit constaté d'avance) mais sont datées dans l'exercice courant — c'est la date qui
 * les fait entrer dans la vue de saison. Sans filtre de motif, la catégorie seule noyait ces
 * quelques lignes parmi toutes les cotisations de l'année.
 */
describe('filtre du grand livre par motif de régularisation', () => {
  let db: any;
  let adhesions: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values([
      { id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date() },
      { id: 2, code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: false, closedAt: null, createdAt: new Date() }
    ]);
    adhesions = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Adhésions & Inscriptions')).get();

    await db.insert(ledgerEntriesTable).values([
      { seasonId: 1, type: 'recette', accountId: 1, categoryId: adhesions.id, amountCents: 23_000, date: '2025-09-10', paymentMethodId: 1, description: 'Cotisation de la saison', accrualType: 'normal', createdAt: new Date() },
      // Encaissée en juin 2026, rattachée à 26-27 : c'est elle que l'encart résume.
      { seasonId: 2, type: 'recette', accountId: 1, categoryId: adhesions.id, amountCents: 23_000, date: '2026-06-20', paymentMethodId: 1, description: 'Réinscription 26-27 encaissée en juin', accrualType: 'produit_constate_avance', accrualNote: '26-27', createdAt: new Date() }
    ]);
  });

  it("ne ramène que les écritures du motif demandé, même rattachées à l'exercice suivant", async () => {
    const res = await listLedgerEntries(db, { seasonId: '25-26', category: String(adhesions.id), type: 'recette', accrual: 'produit_constate_avance' }, { page: 1, limit: 20 });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].description).toBe('Réinscription 26-27 encaissée en juin');
  });

  it('sans motif, la catégorie ramène tout, comme avant', async () => {
    const res = await listLedgerEntries(db, { seasonId: '25-26', category: String(adhesions.id), type: 'recette' }, { page: 1, limit: 20 });
    expect(res.data).toHaveLength(2);
  });
});
