import { seasonsTable, ledgerEntriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { membershipsTable } from '@nba/members/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { accountingRouter } from '@nba/accounting-api';
import { setupMockDb } from '@nba/db/test-utils';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { AppError } from '@nba/db';
import { eq } from 'drizzle-orm';
import { bankStatementLinesTable, accountsTable } from '../../../libs/domains/accounting/shared/schema';

/**
 * Le règlement d'une cotisation appartient à Poona, et à lui seul.
 *
 * `memberships.amount_received_cents` n'a qu'un écrivain : l'import de l'export fédéral. Le
 * rapprochement bancaire, la saisie d'un chèque et la suppression d'une écriture y écrivaient
 * aussi. Comme un même règlement figure des deux côtés, il comptait deux fois — et le total
 * dépendait de l'ordre entre la comptabilité et l'import, donc changeait tout seul au prochain
 * import, sans que rien ne le signale. Ces chemins additionnaient de surcroît une valeur
 * absolue sans regarder le `type` : un remboursement d'adhésion gonflait le montant reçu.
 *
 * Ces cas fixent la règle, et non l'absence d'un appel : ils lisent l'adhésion avant et après,
 * et exigent qu'elle n'ait pas bougé d'un centime. Un futur branchement, par quelque porte que
 * ce soit, les fera tomber.
 *
 * Ils vivent ici plutôt que dans `accounting` : la règle enjambe trois tranches et deux
 * domaines, et c'est l'application qui les compose. Prise séparément, chaque tranche ne montre
 * qu'une porte — c'est précisément ainsi que la règle s'était perdue.
 */
describe("le règlement de l'adhérent n'appartient qu'à Poona", () => {
  const app = new Hono<{ Bindings: { DB: any } }>();
  app.onError((err, c) =>
    c.json({ success: false, error: err.message }, err instanceof AppError ? (err as any).status || 400 : 500)
  );
  app.route('/accounting', accountingRouter);

  let db: any;
  let mockD1: any;
  let seasonId: number;
  let accountId: number;
  let paymentMethodId: number;
  let membershipId: number;

  /** 260 € dûs, 260 € reçus : une cotisation soldée, telle que Poona la connaît. */
  const POONA = { amountDueCents: 26000, amountReceivedCents: 26000, amountRemainingCents: 0, paid: true };
  const INTACTE = { recu: 26000, reste: 0, paid: true };

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    mockD1 = mock.mockD1;

    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31',
      active: true, createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    accountId = (await db.select().from(accountsTable).limit(1).get()).id;
    paymentMethodId = (await db.select().from(paymentMethodsTable).limit(1).get()).id;

    membershipId = (await insertMemberFixture(db, {
      licence: '07100001', lastName: 'DOMASZEWICZ', firstName: 'Katrina', seasonId, ...POONA
    })).id;
  });

  async function adhesion() {
    const row = await db.select().from(membershipsTable).where(eq(membershipsTable.id, membershipId)).get();
    return { recu: row.amountReceivedCents, reste: row.amountRemainingCents, paid: row.paid };
  }

  async function ligneBancaire(amountCents: number) {
    return db.insert(bankStatementLinesTable).values({
      fitid: `FIT-${amountCents}`, accountId, amountCents, date: '2026-01-15',
      name: 'VIR RECU DOMASZEWICZ', status: 'pending', createdAt: new Date()
    }).returning().get();
  }

  async function rapprocher(ligneId: number, type: 'recette' | 'depense', amount: number, description: string) {
    const res = await app.request(
      `http://localhost/accounting/bank-transactions/${ligneId}/reconcile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          memberId: membershipId,
          transaction: {
            seasonId, type, accountId, category: 1, amount,
            date: '2026-01-15', paymentMethod: paymentMethodId, description
          }
        })
      },
      { DB: mockD1 }
    );
    expect(res.status).toBe(200);
  }

  it("ne bouge pas quand un encaissement d'adhésion est rapproché", async () => {
    const ligne = await ligneBancaire(26000);
    await rapprocher(ligne.id, 'recette', 26000, 'Cotisation');
    expect(await adhesion()).toEqual(INTACTE);
  });

  it("ne bouge pas quand un remboursement d'adhésion est rapproché", async () => {
    /*
      Le cas qui a coûté 547,94 € en production : la dépense était ajoutée en valeur absolue,
      sans regarder le `type`, si bien qu'un remboursement gonflait le montant reçu.
    */
    const ligne = await ligneBancaire(-10000);
    await rapprocher(ligne.id, 'depense', 10000, 'Remboursement chèque sport');
    expect(await adhesion()).toEqual(INTACTE);
  });

  it("ne bouge pas quand un chèque d'adhésion est enregistré", async () => {
    const res = await app.request(
      'http://localhost/accounting/checks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: String(seasonId), number: '1234567', amount: 26000,
          emitter: 'DOMASZEWICZ', date: '2026-01-15', category: 1, memberId: membershipId
        })
      },
      { DB: mockD1 }
    );
    expect(res.status).toBe(200);
    expect(await adhesion()).toEqual(INTACTE);
  });

  it("ne bouge pas quand l'écriture rattachée est supprimée", async () => {
    const ecriture = await db.insert(ledgerEntriesTable).values({
      seasonId, type: 'recette', accountId, categoryId: 1, amountCents: 26000,
      date: '2026-01-15', paymentMethodId, description: 'Cotisation',
      memberId: membershipId, createdAt: new Date()
    }).returning().get();

    const res = await app.request(
      `http://localhost/accounting/transactions/${ecriture.id}`,
      { method: 'DELETE' },
      { DB: mockD1 }
    );
    expect(res.status).toBe(200);
    expect(await adhesion()).toEqual(INTACTE);
  });
});
