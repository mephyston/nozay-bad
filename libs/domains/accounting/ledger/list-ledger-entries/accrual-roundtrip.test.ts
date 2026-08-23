import { seasonsTable, ledgerEntriesTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { ListTransactionsRepository } from './repository';

/**
 * Un cut-off enregistré doit se relire.
 *
 * La projection du grand livre ne renvoyait ni `accrualType` ni `accrualNote` : l'écran
 * affichait « Normal » sur une écriture pourtant rattachée à l'exercice suivant, et le
 * formulaire de modification renvoyait ce « Normal » au serveur, qui l'écrivait. Le
 * rattachement disparaissait à la première retouche de l'écriture.
 */
describe('rattachement d’exercice relu depuis le grand livre', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).run();
  });

  it("renvoie le produit constaté d'avance et sa note", async () => {
    const season = await db.select().from(seasonsTable).limit(1).get();
    await db.insert(ledgerEntriesTable).values({
      seasonId: season.id,
      type: 'recette',
      accountId: 1,
      categoryId: 1,
      amountCents: 25000,
      date: '2026-08-21',
      paymentMethodId: 1,
      description: 'VIR INST RE 673390599511',
      accrualType: 'produit_constate_avance',
      accrualNote: 'Saison 26-27',
      createdAt: new Date()
    }).run();

    const repo = new ListTransactionsRepository();
    const rows = await repo.list(db, { seasonId: season.id } as any, { limit: 50, offset: 0 });
    const row = rows.find((r: any) => r.description.includes('673390599511'));

    expect(row).toBeDefined();
    expect(row.accrualType).toBe('produit_constate_avance');
    expect(row.accrualNote).toBe('Saison 26-27');
  });
});
