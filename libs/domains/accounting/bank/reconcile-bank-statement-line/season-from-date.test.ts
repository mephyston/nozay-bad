import { seasonsTable, ledgerEntriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { reconcileBankStatementLine } from './handler';
import { bankStatementLinesTable, accountsTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Repli sur la date quand aucun exercice n'est transmis.
 *
 * L'écran de rapprochement, lui, transmet toujours l'exercice de rattachement : le compte
 * de résultat le lit dans `season_id`, tandis que la trésorerie raisonne sur la date — une
 * cotisation encaissée en août pour la rentrée porte la saison suivante et une date d'août.
 * Ce repli existe pour les appelants qui n'ont pas d'exercice à donner, et il doit rester
 * juste : sans lui, une écriture partirait sans exercice du tout.
 *
 * Il ne convient qu'aux écritures ordinaires. Une régularisation se définit par l'écart
 * entre sa date et son exercice — déduire le second de la première le supprime, et
 * produit une écriture qui se contredit. Le dernier cas ci-dessous le fixe.
 */
describe("exercice déduit de la date quand aucun n'est transmis", () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values([
      { code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() },
      { code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31', active: false, createdAt: new Date() }
    ]).run();
  });

  async function reconcileAt(date: string, accrual?: { accrualType: string; accrualNote: string }) {
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
        // Aucun `seasonId` transmis : c'est tout l'objet du test.
        type: 'recette',
        accountId: acc.id,
        category: 1,
        amount: 25000,
        date,
        paymentMethod: pm.id,
        description: 'Cotisation',
        ...(accrual ?? {})
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

  it("refuse une régularisation, que ce repli ne sait pas rattacher", async () => {
    /*
      Un produit constaté d'avance encaissé le 21 août appartient à l'exercice suivant.
      Le repli, lui, ne connaît que la date et rend celui qui la contient : il rattacherait
      donc l'encaissement à l'exercice qui se clôture, avec un motif qui affirme le
      contraire. Les deux ne peuvent pas être justes en même temps, et c'est l'appelant qui
      doit nommer l'exercice — l'écran de rapprochement le transmet toujours.
    */
    await expect(
      reconcileAt('2026-08-21', {
        accrualType: 'produit_constate_avance',
        accrualNote: "Cotisation encaissée d'avance pour la saison 26-27."
      })
    ).rejects.toThrow("constaté d'avance");
  });
});
