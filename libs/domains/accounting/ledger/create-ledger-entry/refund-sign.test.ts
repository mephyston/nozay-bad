import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable, ledgerEntriesTable, paymentMethodsTable } from '../../shared/schema';
import { createLedgerEntry } from './handler';

/**
 * Le remboursement d'une recette, **jusqu'en base**.
 *
 * Livré le 25/09/2026 avec des tests qui ne regardaient que la requête envoyée par le
 * formulaire : la base, elle, refusait tout montant négatif (CHECK de la 0023), et
 * l'interrupteur « Remboursement » échouait à coup sûr. Ces tests passent par le vrai
 * handler, sur la base réelle et ses migrations — la 0040 comprise.
 */
describe('recette négative (remboursement) en base', () => {
  let db: any;
  let moyen: string;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.insert(seasonsTable).values({
      id: 1, code: '26-27', name: 'Saison 2026-2027',
      startDate: '2026-09-01', endDate: '2027-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    moyen = (await db.select().from(paymentMethodsTable).all()).find((m: any) => m.kind === 'transfer').code;
  });

  const saisir = (type: 'recette' | 'depense', amount: number) =>
    createLedgerEntry(db, {
      seasonId: '26-27',
      type,
      accountId: 'current',
      category: '1',
      amount,
      date: '2026-09-27',
      paymentMethod: moyen,
      description: 'Trop-perçu de cotisation'
    });

  it('enregistre une recette négative', async () => {
    await saisir('recette', -10_000);
    const rows = await db.select().from(ledgerEntriesTable).all();
    expect(rows.map((r: any) => [r.type, r.amountCents])).toEqual([['recette', -10_000]]);
  });

  it('refuse toujours une dépense négative et un montant nul', async () => {
    await expect(saisir('depense', -10_000)).rejects.toThrow();
    await expect(
      db.insert(ledgerEntriesTable).values({
        seasonId: 1, type: 'recette', accountId: 1, categoryId: 1, amountCents: 0,
        date: '2026-09-27', paymentMethodId: 1, description: 'Nul', createdAt: new Date()
      })
    ).rejects.toThrow();
    expect(await db.select().from(ledgerEntriesTable).all()).toHaveLength(0);
  });
});
