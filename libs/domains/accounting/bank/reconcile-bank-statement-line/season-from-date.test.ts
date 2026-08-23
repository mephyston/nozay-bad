import { seasonsTable, ledgerEntriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { reconcileBankStatementLine } from './handler';
import { bankStatementLinesTable, accountsTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * L'exercice d'une écriture se déduit de sa date, jamais de l'écran.
 *
 * Le client transmettait la saison affichée dans le sélecteur de l'en-tête — qui ne filtre
 * rien et sert surtout à l'analyse. Une cotisation encaissée le 21 août appartient à
 * l'exercice qui contient ce jour-là ; si l'argent revient économiquement à la saison
 * suivante, c'est le cut-off qui le dit, pas le millésime de l'écriture.
 */
describe("exercice déduit de la date de l'écriture", () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values([
      { code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() },
      { code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31', active: false, createdAt: new Date() }
    ]).run();
  });

  async function reconcileAt(date: string) {
    const acc = await db.select().from(accountsTable).limit(1).get();
    const pm = await db.select().from(paymentMethodsTable).limit(1).get();
    const btx = await db.insert(bankStatementLinesTable).values({
      fitid: `FIT-${date}`,
      accountId: acc.id,
      amountCents: 25000,
      date,
      name: 'VIR INST RE 673390599511',
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    await reconcileBankStatementLine(db, btx.id, {
      action: 'create',
      transaction: {
        // Aucun `seasonId` : c'est tout l'objet du test.
        type: 'recette',
        accountId: acc.id,
        category: 1,
        amount: 25000,
        date,
        paymentMethod: pm.id,
        description: 'Cotisation',
        accrualType: 'produit_constate_avance',
        accrualNote: "Cotisation encaissée d'avance pour la saison 26-27."
      }
    });

    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.bankStatementLineId, btx.id)).get();
  }

  it("rattache un encaissement du 21 août à l'exercice qui contient cette date", async () => {
    const entry = await reconcileAt('2026-08-21');
    const season = await db.select().from(seasonsTable).where(eq(seasonsTable.id, entry.seasonId)).get();
    expect(season.code).toBe('25-26');
  });

  it("bascule d'exercice au 1er septembre, sans que rien n'ait été transmis", async () => {
    const entry = await reconcileAt('2026-09-02');
    const season = await db.select().from(seasonsTable).where(eq(seasonsTable.id, entry.seasonId)).get();
    expect(season.code).toBe('26-27');
  });

  it('conserve le cut-off qui, lui, désigne la saison suivante', async () => {
    const entry = await reconcileAt('2026-08-21');
    expect(entry.accrualType).toBe('produit_constate_avance');
    expect(entry.accrualNote).toContain('26-27');
  });
});
