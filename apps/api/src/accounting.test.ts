import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { accountingRouter } from '@nba/accounting-api';
import { setupMockDb } from '@nba/db/test-utils';

import { seasonBalancesTable, bankStatementLinesTable, checksTable, checkDepositsTable, invoicesTable, accountClassesTable, seasonCategoryBudgetsTable } from '../../../libs/domains/accounting/shared/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@nba/db';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { membershipsTable } from '@nba/members/schema';

const app = new Hono<{ Bindings: { DB: any; AI: any } }>();
app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  return c.json({ success: false, error: err.message }, 500);
});
app.route('/accounting', accountingRouter);

describe('GET /accounting/seasons', () => {
  it('should return the list of seasons in descending order', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    // Pre-populate with another season to verify ordering
    await db.insert(seasonsTable).values({
      id: 2,
      code: '26-27',
      name: 'Saison 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-08-31',
      active: false,
      createdAt: new Date(),
    }).run();

    const res = await app.request('http://localhost/accounting/seasons', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2); // '26-27' and default '25-26'
    expect(body.data[0].code ?? body.data[0].id).toBe('26-27');
    expect(body.data[1].code ?? body.data[1].id).toBe('25-26');
  });
});

describe('POST and PUT /accounting/seasons', () => {
  it('should support creating and updating seasons', async () => {
    const { mockD1, db } = await setupMockDb();
    
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    // Create new season
    const res = await app.request('http://localhost/accounting/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '26-27',
        name: 'Saison 2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-08-31',
        active: true
      })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.code ?? body.data.id).toBe('26-27');
    expect(body.data.active).toBe(true);

    // Verify other seasons became inactive
    const prevSeason = (await db.select().from(seasonsTable).where(eq(seasonsTable.code, '25-26')).get())!;
    expect(Boolean(prevSeason?.active)).toBe(false);

    // Update season
    const updateRes = await app.request('http://localhost/accounting/seasons/26-27', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Saison 2026-2027 Modifiée',
        active: false
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json() as any;
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.name).toBe('Saison 2026-2027 Modifiée');
    expect(updateBody.data.active).toBe(false);
  });

  it('should support closing a season and block write actions on closed season', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();
    
    // Close season
    const closeRes = await app.request('http://localhost/accounting/seasons/25-26/close', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(closeRes.status).toBe(200);
    const closeBody = await closeRes.json() as any;
    expect(closeBody.success).toBe(true);

    // Try to create transaction
    const txRes = await app.request('http://localhost/accounting/ledger-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        category: 'adhesions',
        amount: 5000,
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Should fail'
      })
    }, { DB: mockD1 as any });
    expect(txRes.status).toBe(400);
    const txBody = await txRes.json() as any;
    expect(txBody.success).toBe(false);
    expect(txBody.error).toContain('clôtur');
  });
});

describe('Accounting API Endpoints', () => {
  it('should manage season balances, transactions, and generate reports', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    // 1. Post initial balance
    const balRes = await app.request('http://localhost/accounting/seasons/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { accountId: 'current', initialBalanceCents: 100000 }, // 1000 €
        { accountId: 'cash', initialBalanceCents: 5000 }      // 50 €
      ])
    }, { DB: mockD1 as any });
    expect(balRes.status).toBe(200);

    // 2. Add dynamic transaction
    const txRes = await app.request('http://localhost/accounting/ledger-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        category: 1,
        amount: 25000, // 250 €
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Cotisation Dupont'
      })
    }, { DB: mockD1 as any });
    if (txRes.status !== 200) {
      console.log('TX_RES_ERROR:', await txRes.text());
    }
    expect(txRes.status).toBe(200);

    // 3. Le grand livre refuse un virement : il n'écrit qu'une ligne là où il en faut deux.
    const refusedRes = await app.request('http://localhost/accounting/ledger-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'transfert',
        accountId: 'current',
        amount: 20000,
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Approvisionnement Caisse'
      })
    }, { DB: mockD1 as any });
    expect(refusedRes.status).toBe(400);

    // 3b. Le virement s'écrit sur sa propre route, en deux jambes (courant → caisse).
    const transferRes = await app.request('http://localhost/accounting/internal-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        sourceAccountId: 'current',
        destinationAccountId: 'cash',
        amountCents: 20000, // 200 €
        sourceDate: '2026-07-13',
        description: 'Approvisionnement Caisse'
      })
    }, { DB: mockD1 as any });
    if (transferRes.status !== 200) {
      console.log('TRANSFER_RES_ERROR:', await transferRes.clone().text());
    }
    expect(transferRes.status).toBe(200);

    // 4. Fetch reports and assert correct balances
    const reportRes = await app.request('http://localhost/accounting/seasons/25-26/reports', undefined, { DB: mockD1 as any });
    expect(reportRes.status).toBe(200);
    const report = await reportRes.json() as any;
    expect(report.success).toBe(true);

    const pnl = report.data.compteResultat;
    expect(pnl.totalRecettes).toBe(25000);
    expect(pnl.categories['1_recette'].total).toBe(25000);

    const balances = report.data.bilanTrésorerie;
    // Compte courant : 1000 € (init) + 250 € (recette) - 200 € (transfert) = 1050 €
    const current = balances.find((b: any) => b.accountId === 'current');
    expect(current.initialBalance).toBe(100000);
    expect(current.finalBalance).toBe(105000);

    // Caisse : 50 € (init) + 200 € (transfert) = 250 €
    const cash = balances.find((b: any) => b.accountId === 'cash');
    expect(cash.initialBalance).toBe(5000);
    expect(cash.finalBalance).toBe(25000);

    // 4b. Fetch total treasury balance and assert correct sum
    const totalBalRes = await app.request('http://localhost/accounting/seasons/25-26/balance', undefined, { DB: mockD1 as any });
    expect(totalBalRes.status).toBe(200);
    const totalBalJson = await totalBalRes.json() as any;
    expect(totalBalJson.success).toBe(true);
    expect(totalBalJson.data.balance).toBe(130000);

    const invalidBalRes = await app.request('http://localhost/accounting/seasons/invalid/balance', undefined, { DB: mockD1 as any });
    expect(invalidBalRes.status).toBe(400);
    const invalidBalJson = await invalidBalRes.json() as any;
    expect(invalidBalJson.success).toBe(false);
    expect(invalidBalJson.error).toContain('Format de saison invalide');

    // 5. Test GET /accounting/seasons/:seasonId/balances
    const getBalRes = await app.request('http://localhost/accounting/seasons/25-26/balances', undefined, { DB: mockD1 as any });
    expect(getBalRes.status).toBe(200);
    const getBalJson = await getBalRes.json() as any;
    expect(getBalJson.success).toBe(true);
    expect(getBalJson.data).toHaveLength(2);

    // 6. Test GET /accounting/ledger-entries
    const getTxRes = await app.request('http://localhost/accounting/ledger-entries?season=25-26&page=1&limit=20', undefined, { DB: mockD1 as any });
    expect(getTxRes.status).toBe(200);
    const getTxJson = await getTxRes.json() as any;
    expect(getTxJson.success).toBe(true);
    /*
     * Trois écritures, et non deux : la recette, plus les **deux** jambes du virement. C'est le
     * cœur du changement — un virement n'est plus une ligne qui touche deux comptes, mais deux
     * écritures ordinaires, chacune sur son compte, chacune pointable sur sa ligne de relevé.
     */
    expect(getTxJson.data).toHaveLength(3);
    expect(getTxJson.pagination.total).toBe(3);

    const legs = getTxJson.data.filter((t: any) => t.type === 'transfert');
    expect(legs.map((l: any) => l.transferLeg).sort()).toEqual(['destination', 'source']);
    // Chaque jambe nomme le compte d'en face, sans quoi entrant et sortant se ressemblent.
    for (const leg of legs) expect(leg.counterpartAccountId).not.toBeNull();

    // 7. Test DELETE /accounting/ledger-entries/:id
    const txIdToDelete = getTxJson.data[0].id;
    const delRes = await app.request(`http://localhost/accounting/ledger-entries/${txIdToDelete}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json() as any;
    expect(delJson.success).toBe(true);

    // Verify deletion
    const getTxRes2 = await app.request('http://localhost/accounting/ledger-entries?season=25-26', undefined, { DB: mockD1 as any });
    const getTxJson2 = await getTxRes2.json() as any;
    expect(getTxJson2.data).toHaveLength(1);
  });

  it('should manage season budgets and block edits when season is closed', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();
    await db.insert(accountClassesTable).values([
      { code: '60', label: '60 - Achats', type: 'depense', createdAt: new Date() },
      { code: '70', label: '70 - Ventes', type: 'recette', createdAt: new Date() }
    ]).onConflictDoNothing().run();
    await db.insert(categoriesTable).values([
      { id: 1, adminLabel: 'Cotisations', adherentLabel: 'Cotis', hideInExpenses: false, receiptAccountClassId: 2, createdAt: new Date() },
      { id: 2, adminLabel: 'Achats Volants', adherentLabel: 'Volants', hideInExpenses: false, expenseAccountClassId: 1, createdAt: new Date() }
    ]).onConflictDoNothing().run();

    // 1. Post initial budget
    const postRes = await app.request('http://localhost/accounting/seasons/25-26/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { categoryId: 2, type: 'depense', amount: 50000 },
        { categoryId: 1, type: 'recette', amount: 120000 }
      ])
    }, { DB: mockD1 as any });
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json() as any;
    expect(postJson.success).toBe(true);
    expect(postJson.data).toHaveLength(2);

    // 2. Get budget list
    const getRes = await app.request('http://localhost/accounting/seasons/25-26/budget', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(2);
    expect(getJson.data.find((b: any) => b.categoryId === 2).amountCents ?? getJson.data.find((b: any) => b.categoryId === 2).amount).toBe(50000);

    // 3. Close the season
    await db.update(seasonsTable).set({ endDate: '2025-08-31' }).where(eq(seasonsTable.code, '25-26')).run();
    const closeRes = await app.request('http://localhost/accounting/seasons/25-26/close', { method: 'POST' }, { DB: mockD1 as any });
    expect(closeRes.status).toBe(200);

    // 4. Try posting budget again (should fail)
    const postRes2 = await app.request('http://localhost/accounting/seasons/25-26/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { categoryId: 2, type: 'depense', amount: 99999 }
      ])
    }, { DB: mockD1 as any });
    expect(postRes2.status).toBe(400);
    const postJson2 = await postRes2.json() as any;
    expect(postJson2.success).toBe(false);
    expect(postJson2.error).toContain('clôturée');
  });
});

describe('Bank Reconciliation API Endpoints', () => {
  it('should import OFX, list bank transactions, and reconcile them', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    // Mock fichier OFX
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>00050007847
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260216
<TRNAMT>-15.60
<FITID>SG-FITID-TEST-1
<NAME>IONOS SARL
<MEMO>Facture Internet
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    // 1. Simuler l'importation via POST /accounting/bank-statement-lines/import
    const formData = new FormData();
    const file = new File([ofxContent], 'statement.ofx', { type: 'text/plain' });
    formData.append('file', file);

    const importRes = await app.request('http://localhost/accounting/bank-statement-lines/import', {
      method: 'POST',
      body: formData
    }, { DB: mockD1 as any });
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json() as any;
    expect(importJson.success).toBe(true);
    expect(importJson.count).toBe(1);

    // 2. Récupérer les transactions importées via GET /accounting/bank-statement-lines
    const getRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    
    const bankTx = getJson.data[0];
    expect(bankTx.fitid).toBe('SG-FITID-TEST-1');
    expect(bankTx.amountCents ?? bankTx.amount).toBe(-1560); // converti en centimes
    expect([1, 'current']).toContain(bankTx.accountId);

    // 3. Pointer en créant une nouvelle transaction via POST /accounting/bank-statement-lines/:id/reconcile
    const reconRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bankTx.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transaction: {
          seasonId: '25-26',
          type: 'depense',
          accountId: 'current',
          category: 1,
          amount: 1560,
          date: '2026-02-16',
          paymentMethod: 'virement',
          description: 'Facture Internet Ionos',
          reference: 'SG-FITID-TEST-1'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // Vérifier le changement de statut
    const checkRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=reconciled', undefined, { DB: mockD1 as any });
    const checkJson = await checkRes.json() as any;
    expect(checkJson.data).toHaveLength(1);
    expect(checkJson.data[0].status).toBe('reconciled');
  });

  it('supports reconciling a bank transaction directly with a club invoice', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Créer une facture
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0010',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Comité 91',
      totalAmountCents: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 2. Insérer une ligne de relevé bancaire de 150.00 €
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECON-INV-1',
      accountId: 1,
      seasonId: 1,
      amountCents: 15000,
      date: '2026-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 3. Rapprocher via l'API
    const reconcileRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: inv.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7, // Cordage ou autre vente
          amount: 15000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture FAC-2526-NBA91-0010'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconcileRes.status).toBe(200);

    // 4. Vérifier que la facture est payée et que la ligne D1 pointe dessus
    const updatedInv = (await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id)).get())!;
    expect(updatedInv.status).toBe('paid');
    expect(updatedInv.bankStatementLineId).toBe(bt.id);
  });

  it('should return 404 when reconciling with a non-existent invoiceId', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Insérer une ligne de relevé bancaire
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECON-INV-404',
      accountId: 1,
      seasonId: 1,
      amountCents: 15000,
      date: '2026-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 2. Rapprocher avec un invoiceId inexistant
    const reconcileRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: 99999, // non-existent invoice ID
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture Inexistante'
        }
      })
    }, { DB: mockD1 as any });

    expect(reconcileRes.status).toBe(404);
    const body = await reconcileRes.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Facture introuvable');
  });

  it('should return 400 when reconciling with an invoice from a closed season', async () => {
    const { mockD1, db } = await setupMockDb();

    // 1. Créer une saison clôturée
    await db.insert(seasonsTable).values({
      id: 2,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date(),
      createdAt: new Date()
    }).run();

    // 2. Créer une facture dans cette saison
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2425-NBA91-0001',
      seasonId: 2,
      date: '2025-07-14',
      dueDate: '2025-08-14',
      clientName: 'Comité 91',
      totalAmountCents: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Insérer une ligne de relevé bancaire
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECON-INV-CLOSED',
      accountId: 1,
      seasonId: 1,
      amountCents: 15000,
      date: '2025-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 4. Tenter de rapprocher via l'API
    const reconcileRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: inv.id,
        transaction: {
          seasonId: '24-25',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2025-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture FAC-2425-NBA91-0001'
        }
      })
    }, { DB: mockD1 as any });

    expect(reconcileRes.status).toBe(400);
    const body = await reconcileRes.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('La saison de la facture est clôturée.');
  });

  /*
    Le masquage d'une ligne a disparu (migration 0029) : une ligne de relevé se rapproche ou
    reste à traiter. Ce qui restait à couvrir ici, c'est le trajet import → lecture, et le
    filtre par état qui le sert.
  */
  it("importe un relevé et rend la ligne dans la file", async () => {
    const { mockD1, db } = await setupMockDb();

    /*
      L'exercice est semé parce que la liste le filtre désormais réellement.
      Il ne l'était pas : `season=25-26` traversait le handler sans jamais atteindre la
      requête, si bien que le test passait sur une base qui n'avait aucune saison. L'opération
      importée porte la date du 17/02/2026, que cet exercice doit couvrir.
    */
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date(),
    }).onConflictDoNothing().run();

    // Mock fichier OFX
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>00070007847
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260217
<TRNAMT>50.00
<FITID>SG-FITID-TEST-2
<NAME>DUPONT RECETTE
<MEMO>Cotisation
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    // 1. Simuler l'importation via POST /accounting/bank-statement-lines/import
    const formData = new FormData();
    const file = new File([ofxContent], 'statement.ofx', { type: 'text/plain' });
    formData.append('file', file);

    const importRes = await app.request('http://localhost/accounting/bank-statement-lines/import', {
      method: 'POST',
      body: formData
    }, { DB: mockD1 as any });
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json() as any;
    expect(importJson.success).toBe(true);
    expect(importJson.count).toBe(1);

    // 2. Récupérer les transactions importées via GET /accounting/bank-statement-lines (note: savings account because of 00070007847)
    const getRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    
    const bankTx = getJson.data[0];
    expect(bankTx.fitid).toBe('SG-FITID-TEST-2');
    expect(bankTx.amountCents ?? bankTx.amount).toBe(5000); // 50.00 -> 5000 cents
    expect([1, 2, 'savings']).toContain(bankTx.accountId);

    // 3. Le filtre par état ne rend que ce qu'il désigne : rien n'est encore rapproché.
    const checkRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=reconciled', undefined, { DB: mockD1 as any });
    const checkJson = await checkRes.json() as any;
    expect(checkJson.data).toHaveLength(0);
  });

  it('should analyze transactions and update member balances on reconciliation', async () => {
    const { mockD1, db } = await setupMockDb();

    // Assurer que la saison existe
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Mock adhérent et opération
    const m = await insertMemberFixture(db, {
      licence: '1234567',
      seasonId: 1,
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2010-01-01',
      type: 'Loisir',
      amountDueCents: 25000,
      amountReceivedCents: 0,
      amountRemainingCents: 25000,
      parent1Name: 'Sébastien PIGNON',
      importedAt: new Date()
    });

    const [bt] = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-PIGNON-TEST',
      seasonId: 1,
      accountId: 1,
      amountCents: 25000, // 250.00 €
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: M SEBASTIEN PIGNON MOTIF: ADHESION ELIOT PIGNON',
      status: 'pending',
      createdAt: new Date()
    } as any).returning();

    // Mock du binding AI
    const mockAI = {
      run: async (model: string, input: any) => {
        return {
          response: JSON.stringify({
            memberId: m.id,
            memberName: 'Eliot PIGNON',
            category: 1,
            confidence: 0.95
          })
        };
      }
    };

    // 1. Appeler l'endpoint d'analyse
    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // 2. Vérifier que la suggestion a été enregistrée
    const getRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const getJson = await getRes.json() as any;
    const updatedBt = getJson.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions!);
    expect(suggestions.memberId).toBe(m.id);

    // 3. Réaliser le pointage
    const reconRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        btId: bt.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 1,
          amount: 25000,
          date: '2026-02-02',
          paymentMethod: 'virement',
          description: 'Adhésion Eliot PIGNON',
          memberId: m.id,
          reference: 'FITID-PIGNON-TEST'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    /*
      4. Le règlement de l'adhérent ne bouge pas : il appartient à l'export Poona.

      Le rapprochement l'incrémentait, alors que l'import l'écrase — un même règlement,
      présent des deux côtés, comptait deux fois. Cf. `members/shared/schema.ts` et
      `membership-payment-authority.test.ts`.
    */
    const updatedMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(updatedMember.amountReceivedCents).toBe(0);
    expect(updatedMember.amountRemainingCents).toBe(25000);
    expect(updatedMember.paid).toBe(false);

    // 5. Récupérer la transaction créée
    const createdTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.bankStatementLineId, bt.id)).get())!;
    expect(createdTx).toBeDefined();

    // 6. Supprimer la transaction du Grand Livre via l'API
    const deleteRes = await app.request(`http://localhost/accounting/ledger-entries/${createdTx.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // 7. Vérifier que la transaction bancaire est repassée en status = 'pending'
    const resetBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(resetBt.status).toBe('pending');

    // 8. Et il n'a pas davantage bougé à la suppression, dans un sens ou dans l'autre.
    const resetMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(resetMember.amountReceivedCents).toBe(0);
    expect(resetMember.amountRemainingCents).toBe(25000);
    expect(resetMember.paid).toBe(false);
  });

  it('supports analyzing a single transaction ID via query parameter', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const m = await insertMemberFixture(db, {
      licence: '12345678',
      seasonId: 1,
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2015-08-01',
      email: 'eliot@pignon.com',
      status: 'valide',
      type: 'Jeunes',
      amountDueCents: 25000,
      amountReceivedCents: 0,
      amountRemainingCents: 25000,
      paid: false,
      importedAt: new Date()
    });

    const bt1 = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-SINGLE-1',
      seasonId: 1,
      accountId: 1,
      amountCents: 25000,
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: M SEBASTIEN PIGNON MOTIF: ADHESION ELIOT PIGNON',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const bt2 = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-SINGLE-2',
      seasonId: 1,
      accountId: 1,
      amountCents: 1500,
      date: '2026-02-02',
      name: 'SUMUP *NOZAY BAD',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    let aiCallsCount = 0;
    const mockAI = {
      run: async (model: string, input: any) => {
        aiCallsCount++;
        return {
          response: JSON.stringify({
            memberId: m.id,
            memberName: 'Eliot PIGNON',
            category: 1,
            confidence: 0.95
          })
        };
      }
    };

    const analyzeRes = await app.request(`http://localhost/accounting/bank-statement-lines/analyze?season=25-26&id=${bt1.id}`, {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);
    const analyzeJson = await analyzeRes.json() as any;
    expect(analyzeJson.count).toBe(1);
    expect(aiCallsCount).toBe(1);

    const updatedBt1 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt1.id)).get())!;
    expect(updatedBt1.aiSuggestions).not.toBeNull();

    const updatedBt2 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt2.id)).get())!;
    expect(updatedBt2.aiSuggestions).toBeNull();
  });

  it('qualifies a club recharge as an internal transfer, without imputing a category', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt1 = await db.insert(bankStatementLinesTable).values({
      fitid: '30930863000300846000500078472020260602',
      seasonId: 1,
      accountId: 1,
      amountCents: 7000,
      date: '2026-06-02',
      name: 'VIR RECU 9615367317665',
      memo: 'DE: NOZAY BADMINTON MOTIF: Recharge juin 2026',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const bt2 = await db.insert(bankStatementLinesTable).values({
      fitid: '15509713000300846000500078472020260618',
      seasonId: 1,
      accountId: 1,
      amountCents: -1000000,
      date: '2026-06-18',
      name: '000001 VIR EUROPEEN EMIS NET',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: { run: async () => ({}) } as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt1 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt1.id)).get())!;
    expect(updatedBt1.aiSuggestions).not.toBeNull();
    const sug1 = JSON.parse(updatedBt1.aiSuggestions!);
    /*
     * L'analyse **qualifie** le mouvement au lieu de l'imputer.
     *
     * Elle posait ici la catégorie « Virements Internes » (id 15), et l'écran créait alors une
     * recette ou une dépense qui la portait : c'est ainsi que la seconde représentation du
     * virement se fabriquait, ligne de relevé après ligne de relevé. Un virement s'écrit désormais
     * en deux jambes, que le rapprochement ne sait pas produire — il renvoie donc au grand livre.
     */
    expect(sug1.kind).toBe('internal-transfer');
    expect(sug1.memberId).toBeNull();

    const updatedBt2 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt2.id)).get())!;
    expect(updatedBt2.aiSuggestions).not.toBeNull();
    const sug2 = JSON.parse(updatedBt2.aiSuggestions!);
    /*
     * `000001 VIR EUROPEEN EMIS NET` ne porte aucun marqueur : ni « nozay », ni suite de plus de
     * vingt chiffres dans le libellé — la longue suite est dans le `fitid`, que l'analyse ne lit
     * pas. Elle reste donc une écriture ordinaire, et l'ancien test le masquait en acceptant deux
     * catégories possibles.
     */
    expect(sug2.kind).toBe('entry');
    expect(sug2.memberId).toBeNull();
  });

  it('matches transaction category based on exact product price (category 8 for 31.50)', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    await db.run(sql`
      INSERT OR IGNORE INTO product_categories (id, label, accounting_category_id, active, created_at)
      VALUES (1, 'shuttlecock', 8, 1, ${new Date().getTime()})
    `);

    await db.run(sql`
      INSERT INTO products (name, product_category_id, price_cents, stock, active, created_at)
      VALUES ('Babolat 2', 1, 3150, 50, 1, ${new Date().getTime()})
    `);

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '13800243000300846000500078472020260423',
      seasonId: 1,
      accountId: 1,
      amountCents: 3150,
      date: '2026-04-23',
      name: 'VIR RECU 2383707922S',
      memo: 'DE: MLLE LAETITIA CLEMENT MOTIF: Virement de Mlle Laetitia Clement REF: Virement de Mlle Laetitia Clement',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const member = await insertMemberFixture(db, {
      licence: '1234567',
      seasonId: 1,
      firstName: 'Laetitia',
      lastName: 'Clement',
      gender: 'F',
      birthDate: '1995-04-12',
      status: 'valide',
      type: 'Adultes',
      amountDueCents: 0,
      amountReceivedCents: 0,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    const aiMock = {
      run: async (model: string, options: any) => {
        return {
          response: JSON.stringify({
            memberId: member.id,
            memberName: 'Clement Laetitia',
            category: 8,
            confidence: 0.9,
            reasoning: 'Montant de 31.50 EUR correspond exactement au prix des volants Babolat 2.'
          })
        };
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: aiMock as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions!);
    expect(suggestions.category).toBe(8);
    expect(suggestions.memberId).toBe(member.id);
  });

  it('matches transaction category based on product price multiples (category 7 for 30.00 representing 2 strings)', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    await db.run(sql`
      INSERT OR IGNORE INTO product_categories (id, label, accounting_category_id, active, created_at)
      VALUES (2, 'string', 7, 1, ${new Date().getTime()})
    `);

    await db.run(sql`
      INSERT INTO products (name, product_category_id, price_cents, stock, active, created_at)
      VALUES ('Cordage adulte', 2, 1500, 50, 1, ${new Date().getTime()})
    `);

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '16271243000300846000500078472020260324',
      seasonId: 1,
      accountId: 1,
      amountCents: 3000,
      date: '2026-03-24',
      name: 'VIR INST RE 658284570674',
      memo: 'DE: MR OU MME DOMASZEWICZ WOLFGANG DATE: 23/03/2026 20:56 MOTIF: VIR. DE MR OU MME DOMASZEWICZ WOLFG ANG',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const member = await insertMemberFixture(db, {
      licence: '7654321',
      seasonId: 1,
      firstName: 'Wolfgang',
      lastName: 'Domaszewicz',
      gender: 'M',
      birthDate: '1980-11-22',
      status: 'valide',
      type: 'Adultes',
      amountDueCents: 0,
      amountReceivedCents: 0,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    const aiMock = {
      run: async (model: string, options: any) => {
        return {
          response: JSON.stringify({
            memberId: member.id,
            memberName: 'Domaszewicz Wolfgang',
            category: 7,
            confidence: 0.95,
            reasoning: 'Montant de 30.00 EUR correspond exactement à 2 cordages à 15.00 EUR.'
          })
        };
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: aiMock as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions!);
    expect(suggestions.category).toBe(7);
    expect(suggestions.memberId).toBe(member.id);
  });


  it('resolves ambiguous name matching deterministically when multiple members share last name', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Ajouter trois membres de la famille MADRANGE
    const mLaurence = await insertMemberFixture(db, {
      licence: '06654740',
      seasonId: 1,
      lastName: 'MADRANGE',
      firstName: 'Laurence',
      gender: 'F',
      birthDate: '1982-05-26',
      email: 'laurence@test.com',
      status: 'valide',
      type: 'Compétiteurs adultes',
      amountDueCents: 26000,
      amountReceivedCents: 26000,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    await insertMemberFixture(db, {
      licence: '00491827',
      seasonId: 1,
      lastName: 'MADRANGE',
      firstName: 'Paul',
      gender: 'M',
      birthDate: '1994-02-12',
      email: 'paul@test.com',
      status: 'valide',
      type: 'Compétiteurs adultes',
      amountDueCents: 6007,
      amountReceivedCents: 6007,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    // Insérer la transaction de Laurence Madrange pour du cordage
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '62517463000300846000500078472020260704',
      seasonId: 1,
      accountId: 1,
      amountCents: 1500,
      date: '2026-07-04',
      name: 'VIR INST RE 668591169870',
      memo: 'DE: MLLE LAURENCE MADRANGE DATE: 04/07/2026 00:25 MOTIF: cordage',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Mock du service AI pour simuler un échec ou un retour indécis (confidence faible)
    const mockAI = {
      run: async () => {
        throw new Error('AI service error or empty response simulation');
      }
    };

    // Lancer l'analyse
    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // Vérifier que Laurence Madrange a été identifiée de manière déterministe
    const getRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const json = await getRes.json() as any;
    const updatedBt = json.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.memberId).toBe(mLaurence.id);
    expect(sug.category).toBe(7);
  });

  it('resolves parent-child matching correctly when parent name is wrapped in parentheses in database', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Ajouter Lubin LEFEBVRE avec sa mère ARTICO Lucie
    const mLubin = await insertMemberFixture(db, {
      licence: '07355187',
      seasonId: 1,
      lastName: 'LEFEBVRE',
      firstName: 'Lubin',
      gender: 'M',
      birthDate: '2014-09-16',
      email: 'liolef@hotmail.fr',
      status: 'valide',
      type: 'Elite Jeunes (Collège)',
      parent1Name: 'ARTICO Lucie (Parent)',
      amountDueCents: 24100,
      amountReceivedCents: 24100,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    // Insérer la transaction
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '18444113000300846000500078472020260708',
      seasonId: 1,
      accountId: 1,
      amountCents: 1500,
      date: '2026-07-08',
      name: 'VIR INST RE 668997068210',
      memo: 'DE: MLE ARTICO LUCIE OU DATE: 08/07/2026 09:26 MOTIF: Cordage Lubin Avril REF: NOT PROVIDED',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI service error simulation');
      }
    };

    // Lancer l'analyse
    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // Vérifier le match déterministe
    const getRes = await app.request('http://localhost/accounting/bank-statement-lines?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const json = await getRes.json() as any;
    const updatedBt = json.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.memberId).toBe(mLubin.id);
    expect(sug.category).toBe(7);
  });

  it('correctly maps young travel displacement expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const coach = await insertMemberFixture(db, {
      licence: '99887766',
      seasonId: 1,
      lastName: 'TETEVUIDE',
      firstName: 'Cyril',
      gender: 'M',
      birthDate: '1985-05-15',
      email: 'cyril.tetevuide@test.com',
      status: 'valide',
      type: 'Adultes',
      amountDueCents: 0,
      amountReceivedCents: 0,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '58441093000300846000500078472020260511',
      seasonId: 1,
      accountId: 1,
      amountCents: -12020,
      date: '2026-05-11',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: M CYRIL TETEVUIDE REMISE: deplacement jeune avril2026 debut',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
    expect(sug.memberId).toBe(coach.id);
  });

  it('correctly maps young vacation camp stage expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '33178713000300846000500078472020260401',
      seasonId: 1,
      accountId: 1,
      amountCents: -8500,
      date: '2026-04-01',
      name: 'DEBIT DIRECT NDF COACH',
      memo: 'course stage d\'hivers',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
  });

  it('correctly maps ebad wallet tournament registrations to tournois_senior category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '34353683000300846000500078472020260321',
      seasonId: 1,
      accountId: 1,
      amountCents: -1500,
      date: '2026-03-21',
      name: 'DEBIT DIRECT EBAD WALLET',
      memo: 'Portefeuille ebad - inscription tournoi senior',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(5); // Tournois Senior
  });

  it('correctly maps airbnb accommodation expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '33286893000300846000500078472020260223',
      seasonId: 1,
      accountId: 1,
      amountCents: -18000,
      date: '2026-02-23',
      name: 'DEBIT CB AIRBNB',
      memo: 'airbnb deplacement championnat jeunes parents',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
  });

  it('prioritizes membership keywords over exact amount product matches in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '2184623000300846000500078472020260508',
      seasonId: 1,
      accountId: 1,
      amountCents: 6000,
      date: '2026-05-08',
      name: 'VIR INST RE 662880687198',
      memo: 'DE: MAGISSON AYMERIC DATE: 08/05/2026 15:37 MOTIF: de MAGISSON AYMERIC - MAGISSON-AYME RIC-ADHESION2025-2026',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(1); // Adhésions & Inscriptions (not Cordage 7)
  });

  it('correctly maps Easter young camp stage expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '70699513000300846000500078472020260504',
      seasonId: 1,
      accountId: 1,
      amountCents: -12000,
      date: '2026-05-04',
      name: 'DEBIT DIRECT STG PAQUES',
      memo: 'course pour le stage de paques jeunes',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
  });

  it('correctly maps February young camp stage expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '45257253000300846000500078472020260305',
      seasonId: 1,
      accountId: 1,
      amountCents: -14000,
      date: '2026-03-05',
      name: 'VIR SEPA EMIS',
      memo: 'remboursement stage fevrier nba',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
  });

  it('correctly maps stages of minor members to actions_jeunes category in post-processing', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const minor = await insertMemberFixture(db, {
      licence: '07507281',
      seasonId: 1,
      lastName: 'BRIER',
      firstName: 'Martin',
      gender: 'M',
      birthDate: '2018-05-03',
      status: 'valide',
      type: 'Ecole Minibad (U9)',
      amountDueCents: 16600,
      amountReceivedCents: 16600,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '48510893000300846000500078472020260302',
      seasonId: 1,
      accountId: 1,
      amountCents: 10000,
      date: '2026-03-02',
      name: 'VIR RECU 6180351232S',
      memo: 'DE: MLE C TIERCELIN OU M N BRIER MOTIF: stage Martin Brier',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes (overridden from general stage category 13)
    expect(sug.memberId).toBe(minor.id);
  });

  it('correctly maps stages of 18-year-old junior members to actions_jeunes category in post-processing', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const junior = await insertMemberFixture(db, {
      licence: '06944909',
      seasonId: 1,
      lastName: 'DOMASZEWICZ',
      firstName: 'Katrina',
      gender: 'F',
      birthDate: '2008-03-27',
      status: 'valide',
      type: 'Compétiteurs adultes',
      amountDueCents: 25000,
      amountReceivedCents: 25000,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '12345678901234567890',
      seasonId: 1,
      accountId: 1,
      amountCents: 5000,
      date: '2026-03-02',
      name: 'VIR INST RE 656089292063',
      memo: 'DE: MR OU MME DOMASZEWICZ WOLFGANG MOTIF: DOMASZEWICZ KATRINA STAGE 2JOURS',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes (overridden from stage category 13 because Katrina is 18, which is <= 18)
    expect(sug.memberId).toBe(junior.id);
  });

  it('correctly maps coach displacement during holiday months to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '19050983000300846000500078472020260227',
      seasonId: 1,
      accountId: 1,
      amountCents: -13969,
      date: '2026-02-27',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: Tetevuide Cyril MOTIF: deplacement Fevrier 2026',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    if (analyzeRes.status !== 200) {
      console.log('ANALYZE ERROR:', await analyzeRes.json());
    }
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes (overridden from general coach salary/travel category 9)
  });

  it('correctly maps coach air bnb accommodation during holiday months to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '17777713000300846000500078472020260225',
      seasonId: 1,
      accountId: 1,
      amountCents: -5111,
      date: '2026-02-25',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: Tetevuide Cyril MOTIF: air bnb bourge 21fev',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes (overridden from general coach salary/travel category 9)
  });

  it('correctly maps stages of players containing name in between stage and month to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '33286873000300846000500078472020260223',
      seasonId: 1,
      accountId: 1,
      amountCents: 7500,
      date: '2026-02-23',
      name: 'VIR RECU 9605385631002',
      memo: 'DE: M OU MME AUDAS CHRISTOPHE MOTIF: Stage Mael Audas Fevrier 26',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes (overridden from general stage category 13 because of Stage + Fevrier combination)
  });

  it('correctly maps minibad stage expenses to actions_jeunes category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '33286863000300846000500078472020260223',
      seasonId: 1,
      accountId: 1,
      amountCents: 2500,
      date: '2026-02-23',
      name: 'VIR INST RE 655481617560',
      memo: 'DE: MR ALVES RODRIGUES MICHAEL MOTIF: Stage minibad Antoine Rodrigues',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(4); // Actions Jeunes
  });

  it('correctly maps supplier cordage purchases from Larde Sports to cordage category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '15816003000300846000500078472020260211',
      seasonId: 1,
      accountId: 1,
      amountCents: -28000,
      date: '2026-02-11',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: LARDE SPORTS SENART REMISE: FC26000332 cordage nba janv26',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(7); // Cordage Vente
  });

  it('correctly maps blackminton event registration to tournois_senior category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '57168863000300846000500078472020260131',
      seasonId: 1,
      accountId: 1,
      amountCents: 500,
      date: '2026-01-31',
      name: 'VIR INST RE 653186740833',
      memo: 'DE: MLLE LAURENCE MADRANGE MOTIF: blackminton',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(5); // Tournois Senior
  });

  it('correctly maps ICR/interclubs related expenses to championnats category in deterministic fallback', async () => {
    const { mockD1, db } = await setupMockDb();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: '34937793000300846000500078472020260126',
      seasonId: 1,
      accountId: 1,
      amountCents: -23730,
      date: '2026-01-26',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: Tetevuide Cyril MOTIF: course icr avec cafe',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions!);
    expect(sug.category).toBe(12); // Championnats
  });

  it('correctly maps licence keyword to membership category when amount is positive, and to licences_federation when amount is negative', async () => {
    const { mockD1, db } = await setupMockDb();

    const bt1 = await db.insert(bankStatementLinesTable).values({
      fitid: 'GEN-2526-115',
      seasonId: 1,
      accountId: 1,
      amountCents: 5800,
      date: '2025-10-01',
      name: 'VIR RECU 0180513616S',
      memo: 'DE: MR OU MME SEBASTIEN TETEVUIDE - licence 2',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const bt2 = await db.insert(bankStatementLinesTable).values({
      fitid: 'GEN-2526-116',
      seasonId: 1,
      accountId: 1,
      amountCents: -15000,
      date: '2025-10-02',
      name: 'VIR LIGUE IDF BADMINTON',
      memo: 'Facture licences debut de saison',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/accounting/bank-statement-lines/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt1 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt1.id)).get())!;
    const sug1 = JSON.parse(updatedBt1.aiSuggestions!);
    expect(sug1.category).toBe(1); // Adhesions

    const updatedBt2 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt2.id)).get())!;
    const sug2 = JSON.parse(updatedBt2.aiSuggestions!);
    expect(sug2.category).toBe(11); // Licences Federation
  });

  it('does not impact member remaining balance when linking a non-membership transaction (e.g. cordage)', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Ajouter un adhérent
    const m = await insertMemberFixture(db, {
      licence: '1234567',
      seasonId: 1,
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2010-01-01',
      status: 'valide',
      type: 'Loisir',
      amountDueCents: 25000,
      amountReceivedCents: 0,
      amountRemainingCents: 25000,
      importedAt: new Date()
    });

    // 2. Insérer une transaction bancaire de cordage (15.00 €)
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'TEST-CORDAGE-BT',
      seasonId: 1,
      accountId: 1,
      amountCents: 1500,
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: MLE ARTICO LUCIE MOTIF: Cordage',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 3. Réaliser le pointage avec la catégorie 'cordage_vente'
    const reconRes = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        btId: bt.id,
        memberId: m.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 'cordage_vente',
          amount: 1500,
          date: '2026-02-02',
          paymentMethod: 'virement',
          description: 'Achat cordage Eliot PIGNON',
          memberId: m.id,
          reference: 'FITID-CORDAGE'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // 4. Vérifier que l'adhérent a son solde d'adhésion inchangé (toujours 250.00 € restant, amountReceived à 0)
    const updatedMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(updatedMember.amountReceivedCents).toBe(0);
    expect(updatedMember.amountRemainingCents).toBe(25000);
    expect(updatedMember.paid).toBe(false);

    // 5. Récupérer la transaction créée
    const createdTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.bankStatementLineId, bt.id)).get())!;
    expect(createdTx).toBeDefined();

    // 6. Supprimer cette transaction
    const deleteRes = await app.request(`http://localhost/accounting/ledger-entries/${createdTx.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // 7. Vérifier que le solde de l'adhérent est toujours inchangé et n'a pas été déduit négativement
    const finalMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(finalMember.amountReceivedCents).toBe(0);
    expect(finalMember.amountRemainingCents).toBe(25000);
  });

  it('supports checks and check-deposits workflow endpoints', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Ajouter un adhérent
    const m = await insertMemberFixture(db, {
      licence: '7766554',
      seasonId: 1,
      lastName: 'DUPONT',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1995-05-05',
      status: 'valide',
      type: 'Adulte',
      amountDueCents: 26000,
      amountReceivedCents: 0,
      amountRemainingCents: 26000,
      importedAt: new Date()
    });

    // 2. Insérer un chèque via POST /accounting/checks (Catégorie adhésion)
    const checkPostRes = await app.request('http://localhost/accounting/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '8877665',
        amount: 26000, // 260.00 €
        emitter: 'Jean Dupont',
        bank: 'Bred',
        memberId: m.id,
        category: 1,
        date: '2026-07-10'
      })
    }, { DB: mockD1 as any });
    expect(checkPostRes.status).toBe(200);

    // 3. La fiche de l'adhérent ne bouge pas : son règlement vient de Poona, pas de la
    //    comptabilité. Le chèque porte son `member_id`, et cela suffit à dire à quelle
    //    adhésion il se rapporte.
    const updatedMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(updatedMember.amountReceivedCents).toBe(0);
    expect(updatedMember.amountRemainingCents).toBe(26000);
    expect(updatedMember.paid).toBe(false);

    // 4. Récupérer le chèque via GET /accounting/checks
    const getRes = await app.request('http://localhost/accounting/checks?season=25-26&status=received', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json() as any;
    expect(getBody.data).toHaveLength(1);
    expect(getBody.data[0].number).toBe('8877665');
    expect(getBody.data[0].memberName).toBe('DUPONT Jean');

    const checkId = getBody.data[0].id;
    const txId = getBody.data[0].ledgerEntryId;
    const checkTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get())!;
    expect(checkTx.date).toBe('2026-07-10');
    // Un chèque naît en coffre : c'est de ce statut que le solde bancaire théorique se déduit.
    expect(checkTx.status).toBe('in_vault');
    // La liste porte la date et la catégorie de la recette : le formulaire de
    // modification les prérenseigne sans second appel.
    expect(getBody.data[0].date).toBe('2026-07-10');
    expect(getBody.data[0].categoryId).toBe(1);

    // 4b. Corriger le chèque : numéro, montant, date, catégorie, et détacher l'adhérent.
    //     La recette liée suit d'un seul geste.
    const putRes = await app.request(`http://localhost/accounting/checks/${checkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: '8877666',
        amount: 25000,
        emitter: 'Jean Dupont',
        bank: 'Bred',
        memberId: null,
        category: 2,
        date: '2026-07-11'
      })
    }, { DB: mockD1 as any });
    expect(putRes.status).toBe(200);

    const updatedCheck = (await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get())!;
    expect(updatedCheck.number).toBe('8877666');
    expect(updatedCheck.amountCents).toBe(25000);
    expect(updatedCheck.memberId).toBeNull();
    const updatedTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get())!;
    expect(updatedTx.amountCents).toBe(25000);
    expect(updatedTx.date).toBe('2026-07-11');
    expect(updatedTx.categoryId).toBe(2);
    expect(updatedTx.memberId).toBeNull();
    expect(updatedTx.reference).toBe('Chèque n°8877666');
    expect(updatedTx.description).toBe('Règlement par chèque n°8877666 de Jean Dupont');

    // 5. Créer un bordereau de remise de chèques
    const depositRes = await app.request('http://localhost/accounting/check-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        reference: 'REMISE-DE-TEST',
        date: '2026-07-13',
        checkIds: [checkId]
      })
    }, { DB: mockD1 as any });
    expect(depositRes.status).toBe(200);
    const depositBody = await depositRes.json() as any;
    expect(depositBody.data.amount).toBe(25000);

    const depositId = depositBody.data.id;

    // 6. La remise naît « à déposer » ; le chèque, rattaché au bordereau, reste au coffre.
    expect(depositBody.data.status).toBe('pending');
    const checkAfterSlip = (await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get())!;
    expect(checkAfterSlip.status).toBe('received');
    expect(checkAfterSlip.checkDepositId).toBe(depositId);

    // 6a. Encaisser avant d'avoir déposé n'a pas de sens : refusé.
    const tooEarly = await app.request(`http://localhost/accounting/check-deposits/${depositId}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankStatementLineId: 999 })
    }, { DB: mockD1 as any });
    expect(tooEarly.status).toBe(400);

    // Le bordereau est remis au guichet : remise et chèque passent « déposés ».
    const depositConfirm = await app.request(`http://localhost/accounting/check-deposits/${depositId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-07-14' })
    }, { DB: mockD1 as any });
    expect(depositConfirm.status).toBe(200);
    const checkAfterDeposit = (await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get())!;
    expect(checkAfterDeposit.status).toBe('deposited');
    const slipAfterDeposit = (await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, depositId)).get())!;
    expect(slipAfterDeposit.status).toBe('deposited');
    expect(slipAfterDeposit.date).toBe('2026-07-14');

    // 6b. Un chèque remis ne se modifie plus : son montant est figé dans le bordereau.
    const putAfterDeposit = await app.request(`http://localhost/accounting/checks/${checkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: '8877666', amount: 100, emitter: 'Jean Dupont', date: '2026-07-11' })
    }, { DB: mockD1 as any });
    expect(putAfterDeposit.status).toBe(400);
    expect(updatedCheck.amountCents).toBe(25000);

    // 6c. Le bordereau s'imprime en PDF sur le papier à lettre du club.
    // Le papier à lettre lit les images du club dans R2 : un magasin vide suffit, le PDF sort sans image.
    const MEDIA = { head: async () => null, get: async () => null, put: async () => {} } as any;
    const pdfRes = await app.request(`http://localhost/accounting/check-deposits/${depositId}/deposit-slip.pdf`, undefined, { DB: mockD1 as any, MEDIA });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('content-type')).toBe('application/pdf');
    expect(pdfRes.headers.get('content-disposition')).toBe('inline; filename="Bordereau-REMISE-DE-TEST.pdf"');
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    expect(new TextDecoder().decode(pdfBytes.slice(0, 4))).toBe('%PDF');

    const pdfMissing = await app.request('http://localhost/accounting/check-deposits/424242/deposit-slip.pdf', undefined, { DB: mockD1 as any, MEDIA });
    expect(pdfMissing.status).toBe(404);

    // 7. Simuler le rapprochement avec une transaction de relevé bancaire (id: 999)
    // On doit d'abord insérer cette transaction fictive ou simuler son existence
    await db.insert(bankStatementLinesTable).values({
      id: 999,
      fitid: 'SG-DEPOT-999',
      seasonId: 1,
      accountId: 1,
      amountCents: 25000,
      date: '2026-07-13',
      name: 'SG DEPOT CHEQUE',
      status: 'pending',
      createdAt: new Date()
    } as any).run();

    const clearRes = await app.request(`http://localhost/accounting/check-deposits/${depositId}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankStatementLineId: 999
      })
    }, { DB: mockD1 as any });
    expect(clearRes.status).toBe(200);

    // Vérifier le statut de la remise
    const finalDeposit = (await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, depositId)).get())!;
    expect(finalDeposit.status).toBe('cleared');
    expect(finalDeposit.bankStatementLineId).toBe(999);

    // La recette du chèque est pointée sur la ligne et sort du coffre : sans cela, l'état de
    // rapprochement portait un écart du montant de la remise que rien ne nommait.
    const clearedTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get())!;
    expect(clearedTx.bankStatementLineId).toBe(999);
    expect(clearedTx.status).toBe('cleared');
    const clearedLine = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, 999)).get())!;
    expect(clearedLine.status).toBe('reconciled');

    // Défaire la remise encaissée rend tout : ligne en attente, recette au coffre, chèque libéré.
    const undoRes = await app.request(`http://localhost/accounting/check-deposits/${depositId}/delete`, { method: 'POST' }, { DB: mockD1 as any });
    expect(undoRes.status).toBe(200);
    const undoneTx = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get())!;
    expect(undoneTx.bankStatementLineId).toBeNull();
    expect(undoneTx.status).toBe('in_vault');
    const undoneCheck = (await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get())!;
    expect(undoneCheck.status).toBe('received');
    expect(undoneCheck.checkDepositId).toBeNull();

    // 8. Supprimer le chèque
    const delCheckRes = await app.request(`http://localhost/accounting/checks/${checkId}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(delCheckRes.status).toBe(200);

    // Le chèque est supprimé ; la fiche de l'adhérent, elle, n'a jamais bougé.
    const deletedCheck = (await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get())!;
    expect(deletedCheck).toBeUndefined();

    const resetMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(resetMember.amountReceivedCents).toBe(0);
    expect(resetMember.amountRemainingCents).toBe(26000);
    expect(resetMember.paid).toBe(false);
  });

  it('supports check photo vision OCR analysis with Workers AI mock', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Ajouter un adhérent potentiel
    await insertMemberFixture(db, {
      licence: '7766554',
      seasonId: 1,
      lastName: 'DUPONT',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1995-05-05',
      status: 'valide',
      type: 'Adulte',
      amountDueCents: 26000,
      amountReceivedCents: 0,
      amountRemainingCents: 26000,
      importedAt: new Date()
    });

    /*
      Le modèle transcrit, il ne décode pas : sept champs texte « tels qu'écrits », rendus
      en objet par la sortie contrainte. C'est le handler qui fait des centimes, du
      numéro à sept chiffres et de la date ISO — et qui écarte le bénéficiaire (le club).
    */
    const mockAI = {
      run: async (_model: string, input: any) => {
        expect(input.response_format?.type).toBe('json_schema');
        return {
          response: {
            numero_cheque: '8877665 30003 00412',
            montant_chiffres: '260,00',
            montant_lettres: 'deux cent soixante euros',
            beneficiaire: 'Nozay Badminton',
            titulaire: 'JEAN DUPONT',
            banque: 'Société Générale',
            date_emission: '10/07/26'
          }
        };
      }
    };

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'check.png');

    const req = new Request('http://localhost/accounting/checks/analyze', {
      method: 'POST',
      body: formData
    });

    const res = await app.request(req, undefined, { DB: mockD1 as any, AI: mockAI as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.number).toBe('8877665');
    expect(body.data.amount).toBe(26000);
    expect(body.data.emitter).toBe('JEAN DUPONT');
    expect(body.data.bank).toBe('Société Générale');
    expect(body.data.memberName).toBe('DUPONT Jean');
    expect(body.data.date).toBe('2026-07-10');
  });

  it('supports filtering by unreconciled cheques only', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Insert a bank transaction to link with the reconciled check
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-CHECK-RECON-1',
      accountId: 1,
      seasonId: 1,
      amountCents: 10000,
      date: '2026-07-14',
      name: 'CHEQUE DEPOSE',
      status: 'reconciled',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 2. Insert the three transactions:
    // - Outstanding check: paymentMethod = 'cheque', bankStatementLineId = null
    const outstandingCheck = await db.insert(ledgerEntriesTable).values({
      seasonId: 1,
      type: 'recette',
      accountId: 1,
      amountCents: 15000,
      date: '2026-07-14',
      paymentMethodId: 2,
      description: 'Outstanding Check Tx',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // - Reconciled check: paymentMethod = 'cheque', bankStatementLineId = bt.id
    await db.insert(ledgerEntriesTable).values({
      seasonId: 1,
      type: 'recette',
      accountId: 1,
      amountCents: 10000,
      date: '2026-07-14',
      paymentMethodId: 2,
      description: 'Reconciled Check Tx',
      bankStatementLineId: bt.id,
      createdAt: new Date()
    }).run();

    // - Non-check unreconciled transaction: paymentMethod = 'virement', bankStatementLineId = null
    await db.insert(ledgerEntriesTable).values({
      seasonId: 1,
      type: 'recette',
      accountId: 1,
      amountCents: 20000,
      date: '2026-07-14',
      paymentMethodId: 1,
      description: 'Non-check Unreconciled Tx',
      createdAt: new Date()
    }).run();

    const res = await app.request('http://localhost/accounting/ledger-entries?unreconciledCheques=true', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    
    // Assert that only the outstanding check is returned
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(outstandingCheck.id);
    expect(json.data[0].paymentMethod).toBe('cheque');
    expect(json.data[0].bankStatementLineId).toBeNull();
  });
});

describe('Categories API Endpoints', () => {
  it('supports listing, creating, updating and deleting categories', async () => {
    const { mockD1 } = await setupMockDb();

    // 1. List default categories
    const res = await app.request('http://localhost/accounting/categories', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const listJson = await res.json() as any;
    expect(listJson.success).toBe(true);
    expect(listJson.data.length).toBeGreaterThanOrEqual(14);

    // 2. Create custom category
    const createRes = await app.request('http://localhost/accounting/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'custom_grip',
        adminLabel: 'Achat de grips et surgrips',
        adherentLabel: 'Grips & Accessoires',
        hideInExpenses: false
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(true);
    expect(typeof createJson.data.id).toBe('number');

    const customGripId = createJson.data.id;

    // 3. Update category
    const updateRes = await app.request(`http://localhost/accounting/categories/${customGripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminLabel: 'Grips (vente ou achat)',
        adherentLabel: 'Grips & Accessoires',
        hideInExpenses: true
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.adminLabel).toBe('Grips (vente ou achat)');
    expect(updateJson.data.hideInExpenses).toBe(true);

    // 4. Delete category
    const deleteRes = await app.request(`http://localhost/accounting/categories/${customGripId}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);
    const deleteJson = await deleteRes.json() as any;
    expect(deleteJson.success).toBe(true);
  });
});

describe('Account Classes API Endpoints', () => {
  it('supports listing, creating, updating and deleting account classes', async () => {
    const { mockD1 } = await setupMockDb();

    const res = await app.request('http://localhost/accounting/account-classes', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const listJson = await res.json() as any;
    expect(listJson.success).toBe(true);

    const createRes = await app.request('http://localhost/accounting/account-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '63',
        label: '63 - Impôts et taxes',
        type: 'depense'
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(true);
    expect(String(createJson.data.code)).toContain('63');

    const updateRes = await app.request('http://localhost/accounting/account-classes/63', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: '63 - Impôts, taxes et versements',
        type: 'depense'
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.label).toBe('63 - Impôts, taxes et versements');

    const deleteRes = await app.request('http://localhost/accounting/account-classes/63', {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);
    const deleteJson = await deleteRes.json() as any;
    expect(deleteJson.success).toBe(true);
  });
});

describe('Invoices API Endpoints', () => {
  it('manages invoices workflow endpoints and handles next sequential code generation', async () => {
    const { mockD1, db } = await setupMockDb();

    // Ensure season exists and is not closed
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a first invoice
    const createRes = await app.request('http://localhost/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-14',
        dueDate: '2026-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000,
        items: [{ description: 'Stage ligue', quantity: 2, unitPrice: 6000 }]
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json() as any;
    expect(createData.data.invoiceNumber).toBe('FAC-2526-NBA91-0001');
    const invoiceId1 = createData.data.id;

    // Verify sequential increment
    const createRes2 = await app.request('http://localhost/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-15',
        dueDate: '2026-08-15',
        clientName: 'Ligue IDF n2',
        totalAmount: 5000,
        items: []
      })
    }, { DB: mockD1 as any });
    const createData2 = await createRes2.json() as any;
    expect(createData2.data.invoiceNumber).toBe('FAC-2526-NBA91-0002');
    const invoiceId2 = createData2.data.id;

    // GET /accounting/invoices with season filter
    const getListRes = await app.request('http://localhost/accounting/invoices?season=25-26', undefined, { DB: mockD1 as any });
    expect(getListRes.status).toBe(200);
    const listData = await getListRes.json() as any;
    expect(listData.success).toBe(true);
    expect(listData.data).toHaveLength(2);

    // GET /accounting/invoices without season parameter (should return 400)
    const getListNoSeasonRes = await app.request('http://localhost/accounting/invoices', undefined, { DB: mockD1 as any });
    expect(getListNoSeasonRes.status).toBe(400);

    // GET /accounting/invoices/:id
    const getInvoiceRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    expect(getInvoiceRes.status).toBe(200);
    const invoiceData = await getInvoiceRes.json() as any;
    expect(invoiceData.success).toBe(true);
    expect(invoiceData.data.invoiceNumber).toBe('FAC-2526-NBA91-0001');
    expect(invoiceData.data.items).toHaveLength(1);
    expect(invoiceData.data.items[0].description).toBe('Stage ligue');

    // GET /accounting/invoices/:id not found
    const getInvoiceNotFoundRes = await app.request('http://localhost/accounting/invoices/99999', undefined, { DB: mockD1 as any });
    expect(getInvoiceNotFoundRes.status).toBe(404);

    // PUT /accounting/invoices/:id (update draft invoice)
    const updateRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-16',
        dueDate: '2026-08-16',
        clientName: 'Ligue IDF Updated',
        totalAmount: 18000,
        items: [
          { description: 'Stage ligue modifié', quantity: 3, unitPrice: 6000 }
        ]
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    
    // Verify changes
    const verifyRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    const verifyData = await verifyRes.json() as any;
    expect(verifyData.data.clientName).toBe('Ligue IDF Updated');
    expect(verifyData.data.date).toBe('2026-07-16');
    expect(verifyData.data.items).toHaveLength(1);
    expect(verifyData.data.items[0].description).toBe('Stage ligue modifié');

    // POST /accounting/invoices/:id/status (transition to sent)
    const statusRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });
    expect(statusRes.status).toBe(200);

    // Verify status update
    const verifyStatusRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    const verifyStatusData = await verifyStatusRes.json() as any;
    expect(verifyStatusData.data.status).toBe('sent');

    // PUT on non-draft should fail
    const updateNonDraftRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-16',
        dueDate: '2026-08-16',
        clientName: 'Ligue IDF Fail',
        totalAmount: 18000
      })
    }, { DB: mockD1 as any });
    expect(updateNonDraftRes.status).toBe(400);

    // DELETE on non-draft/non-cancelled should fail
    const deleteSentRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteSentRes.status).toBe(400);

    // Set status to cancelled
    await app.request(`http://localhost/accounting/invoices/${invoiceId1}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    }, { DB: mockD1 as any });

    // DELETE cancelled invoice should succeed
    const deleteRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // Verify it is deleted
    const verifyDeletedRes = await app.request(`http://localhost/accounting/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    expect(verifyDeletedRes.status).toBe(404);
  });

  it('handles closed seasons blocking invoice write operations', async () => {
    const { mockD1, db } = await setupMockDb();

    // Create a closed season
    await db.insert(seasonsTable).values({
      id: 2,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date(),
      createdAt: new Date()
    }).run();

    // Try to create invoice in closed season
    const createRes = await app.request('http://localhost/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '24-25',
        date: '2025-07-14',
        dueDate: '2025-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(400);
    const createData = await createRes.json() as any;
    expect(createData.error).toContain('clôtur');

    // Create an open season to insert a draft invoice first
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoUpdate({
      target: seasonsTable.id,
      set: { active: true }
    }).run();

    const insertRes = await app.request('http://localhost/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-14',
        dueDate: '2026-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000
      })
    }, { DB: mockD1 as any });
    const invoice = (await insertRes.json() as any).data;

    // Now close the season
    await db.update(seasonsTable).set({ closedAt: new Date() }).where(eq(seasonsTable.id, 1)).run();

    // Try to update invoice in closed season
    const updateRes = await app.request(`http://localhost/accounting/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-15',
        dueDate: '2026-08-15',
        clientName: 'Ligue IDF Updated',
        totalAmount: 15000
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(400);

    // Try to change status in closed season
    const statusRes = await app.request(`http://localhost/accounting/invoices/${invoice.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });
    expect(statusRes.status).toBe(400);

    // Try to delete in closed season
    const deleteRes = await app.request(`http://localhost/accounting/invoices/${invoice.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(400);
  });
});

describe('Final Improvements API checks', () => {
  it('should validate status values in POST /accounting/invoices/:id/status', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create an invoice
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0020',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Test',
      totalAmountCents: 10000,
      status: 'draft',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send invalid status
    const res = await app.request(`http://localhost/accounting/invoices/${inv.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status_value' })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Statut invalide');

    // Send valid status
    const resValid = await app.request(`http://localhost/accounting/invoices/${inv.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });

    expect(resValid.status).toBe(200);
    const bodyValid = await resValid.json() as any;
    expect(bodyValid.success).toBe(true);
  });

  it('should verify NaN IDs and return 400 for specific accounting endpoints', async () => {
    const { mockD1 } = await setupMockDb();

    const endpoints = [
      { url: 'http://localhost/accounting/invoices/not-a-number', method: 'GET' },
      { url: 'http://localhost/accounting/invoices/not-a-number', method: 'PUT', body: {} },
      { url: 'http://localhost/accounting/invoices/not-a-number', method: 'DELETE' },
      { url: 'http://localhost/accounting/invoices/not-a-number/status', method: 'POST', body: { status: 'sent' } }
    ];

    for (const ep of endpoints) {
      const res = await app.request(ep.url, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined
      }, { DB: mockD1 as any });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body).toEqual({ success: false, error: 'Identifiant invalide' });
    }
  });

  it('should lock reconciliation when the bank transaction season is closed', async () => {
    const { mockD1, db } = await setupMockDb();

    // 1. Create a closed season
    await db.insert(seasonsTable).values({
      id: 2,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date(),
      createdAt: new Date()
    }).run();

    // 2. Create bank transaction in closed season
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-CLOSED-SEASON',
      accountId: 1,
      seasonId: 2,
      amountCents: 15000,
      date: '2025-07-15',
      name: 'VIR RECU',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 3. Attempt to reconcile
    const res = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transaction: {
          seasonId: '24-25',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2025-07-15',
          paymentMethod: 'virement',
          description: 'Fail reconcile'
        }
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('clôtur');
  });

  it('should reject reconciliation if the invoice is already paid or cancelled', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a paid invoice
    const invPaid = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0021',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Paid',
      totalAmountCents: 10000,
      status: 'paid',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Create a cancelled invoice
    const invCancelled = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0022',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Cancelled',
      totalAmountCents: 10000,
      status: 'cancelled',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Create bank transaction
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECON-PAID',
      accountId: 1,
      seasonId: 1,
      amountCents: 10000,
      date: '2026-07-15',
      name: 'VIR RECU',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 1. Attempt reconcile with already paid invoice
    const resPaid = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: invPaid.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 10000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Reconcile paid'
        }
      })
    }, { DB: mockD1 as any });

    expect(resPaid.status).toBe(400);
    const bodyPaid = await resPaid.json() as any;
    expect(bodyPaid.success).toBe(false);
    expect(bodyPaid.error).toBe('La facture a déjà été payée ou a été annulée.');

    // 2. Attempt reconcile with cancelled invoice
    const resCancelled = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: invCancelled.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 10000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Reconcile cancelled'
        }
      })
    }, { DB: mockD1 as any });

    expect(resCancelled.status).toBe(400);
    const bodyCancelled = await resCancelled.json() as any;
    expect(bodyCancelled.success).toBe(false);
    expect(bodyCancelled.error).toBe('La facture a déjà été payée ou a été annulée.');
  });
});

describe('Task 1: API Endpoints Advanced Reconciliation', () => {
  it('POST /accounting/bank-statement-lines/reconcile-bulk executes successfully when multiple valid suggestions are matched', async () => {
    const { mockD1, db } = await setupMockDb();

    // Create active season '25-26'
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create bank transactions
    const bt1 = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-BULK-1',
      accountId: 1,
      seasonId: 1,
      amountCents: 10000,
      date: '2026-07-15',
      name: 'VIR RECU 1',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const bt2 = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-BULK-2',
      accountId: 1,
      seasonId: 1,
      amountCents: 20000,
      date: '2026-07-15',
      name: 'VIR RECU 2',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Send bulk reconcile request
    const res = await app.request('http://localhost/accounting/bank-statement-lines/reconcile-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            btId: bt1.id,
            action: 'create',
            transaction: {
              seasonId: '25-26',
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 10000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Bulk Reconcile 1'
            }
          },
          {
            btId: bt2.id,
            action: 'create',
            transaction: {
              seasonId: '25-26',
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 20000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Bulk Reconcile 2'
            }
          }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);

    // Verify bank transactions are reconciled
    const updatedBt1 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt1.id)).get())!;
    const updatedBt2 = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt2.id)).get())!;
    expect(updatedBt1!.status).toBe('reconciled');
    expect(updatedBt2!.status).toBe('reconciled');

    // Verify ledger transactions were created
    const ledgerTxs = await db.select().from(ledgerEntriesTable).all();
    expect(ledgerTxs.filter(t => t.bankStatementLineId === bt1.id)).toHaveLength(1);
    expect(ledgerTxs.filter(t => t.bankStatementLineId === bt2.id)).toHaveLength(1);
  });

  it('POST /accounting/bank-statement-lines/reconcile-bulk rolls back all changes if one matching operation fails or is closed', async () => {
    const { mockD1, db } = await setupMockDb();

    // Create seasons
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    await db.insert(seasonsTable).values({
      id: 2,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date(),
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create bank transactions
    const btValid = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-BULK-VALID',
      accountId: 1,
      seasonId: 1,
      amountCents: 10000,
      date: '2026-07-15',
      name: 'VIR RECU VALID',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const btClosed = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-BULK-CLOSED',
      accountId: 1,
      seasonId: 2, // closed season
      amountCents: 20000,
      date: '2025-07-15',
      name: 'VIR RECU CLOSED',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Send bulk reconcile request
    const res = await app.request('http://localhost/accounting/bank-statement-lines/reconcile-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            btId: btValid.id,
            action: 'create',
            transaction: {
              seasonId: 1,
              type: 'recette',
              accountId: 1,
              category: 7,
              amount: 10000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Valid Item'
            }
          },
          {
            btId: btClosed.id,
            action: 'create',
            transaction: {
              seasonId: 2, // closed season
              type: 'recette',
              accountId: 1,
              category: 7,
              amount: 20000,
              date: '2025-07-15',
              paymentMethod: 'virement',
              description: 'Closed Item'
            }
          }
        ]
      })
    }, { DB: mockD1 as any });

    // Expecting error (e.g. 400 Bad Request or similar error status code)
    expect(res.status).not.toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(false);

    // Verify rollback: valid bt remains pending, no ledger transactions created
    const updatedBtValid = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, btValid.id)).get())!;
    expect(updatedBtValid!.status).toBe('pending');

    const ledgerTxs = await db.select().from(ledgerEntriesTable).all();
    expect(ledgerTxs).toHaveLength(0);
  });

  it('POST /accounting/bank-statement-lines/:id/reconcile successfully processes split transactions creating multiple entries', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-SPLIT',
      accountId: 1,
      seasonId: 1,
      amountCents: 15000,
      date: '2026-07-15',
      name: 'VIR RECU SPLIT',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Send split reconcile request
    const res = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transactions: [
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 7,
            amount: 10000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Split 1'
          },
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 8,
            amount: 5000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Split 2'
          }
        ]
      })
    }, { DB: mockD1 as any });

    if (res.status !== 200) console.log("RECONCILE 45 ERROR:", await res.text());
    expect(res.status).toBe(200);

    // Verify bank transaction is reconciled
    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt!.status).toBe('reconciled');

    // Verify multiple entries are created
    const ledgerTxs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.bankStatementLineId, bt.id)).all();
    expect(ledgerTxs).toHaveLength(2);
    expect(ledgerTxs.map(t => t.amountCents)).toContain(10000);
    expect(ledgerTxs.map(t => t.amountCents)).toContain(5000);
  });

  /*
    Le pointage incrémental, sur une base réelle.

    Le cumul des écritures déjà rattachées se lisait sur `t.amount`, alors que le dépôt rend la
    colonne sous son nom Drizzle `amountCents` : il valait `NaN` dès le second pointage, et la
    ligne ne basculait plus jamais. Les tests de domaine ne pouvaient pas le voir — leur mock
    rendait la forme attendue, pas celle de la base. Seul un test sur D1 le prouve.
  */
  it('POST /accounting/bank-statement-lines/:id/reconcile pointe deux écritures successives et ne solde la ligne qu\'à la seconde', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-INCREMENTAL', accountId: 1, amountCents: 15000, date: '2026-07-15',
      name: 'VIR RECU GROUPE', status: 'pending', createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const ecriture = async (amountCents: number, description: string) =>
      db.insert(ledgerEntriesTable).values({
        seasonId: 1, type: 'recette', accountId: 1, categoryId: 1, amountCents,
        date: '2026-07-15', paymentMethodId: 1, description, createdAt: new Date()
      } as any).returning().then(r => r[0]);

    const premiere = await ecriture(10000, 'Cotisation Dupont');
    const seconde = await ecriture(5000, 'Cotisation Martin');

    const pointer = (ledgerEntryId: number) => app.request(
      `http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'match', ledgerEntryId }) },
      { DB: mockD1 as any }
    );

    expect((await pointer(premiere.id)).status).toBe(200);

    const apresPremier = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(apresPremier.status).toBe('pending');

    expect((await pointer(seconde.id)).status).toBe(200);

    const apresSecond = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(apresSecond.status).toBe('reconciled');

    const liees = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.bankStatementLineId, bt.id)).all();
    expect(liees).toHaveLength(2);
  });

  /* Un pointage de trop soldait la ligne sans rien dire, et laissait deux écritures pour une opération. */
  it('POST /accounting/bank-statement-lines/:id/reconcile refuse un pointage qui dépasse le reste', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-DEPASSEMENT', accountId: 1, amountCents: 15000, date: '2026-07-15',
      name: 'VIR RECU', status: 'pending', createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // 100,00 € déjà rattachés : il ne reste que 50,00 €.
    await db.insert(ledgerEntriesTable).values({
      seasonId: 1, type: 'recette', accountId: 1, categoryId: 1, amountCents: 10000,
      date: '2026-07-15', paymentMethodId: 1, description: 'Première part',
      bankStatementLineId: bt.id, createdAt: new Date()
    } as any).run();

    const detrop = await db.insert(ledgerEntriesTable).values({
      seasonId: 1, type: 'recette', accountId: 1, categoryId: 1, amountCents: 15000,
      date: '2026-07-15', paymentMethodId: 1, description: 'Doublon', createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const res = await app.request(
      `http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'match', ledgerEntryId: detrop.id }) },
      { DB: mockD1 as any }
    );

    expect(res.status).toBe(400);
    expect((await res.json() as any).error).toContain('dépasse le reste à rapprocher');

    const ligne = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(ligne.status).toBe('pending');

    const inchangee = (await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, detrop.id)).get())!;
    expect(inchangee.bankStatementLineId).toBeNull();
  });

  /*
    Un salaire net : brut au débit, retenue au crédit, sur une seule ligne de relevé. Le cumul en
    valeurs absolues comptait 2 060,07 € au lieu de 1 939,93 € et soldait la ligne par excès.
  */
  it('POST /accounting/bank-statement-lines/:id/reconcile solde une ventilation de sens mêlés sur son net', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-SALAIRE', accountId: 1, amountCents: -193993, date: '2026-07-15',
      name: 'VIR EMIS NET', status: 'pending', createdAt: new Date()
    } as any).returning().then(r => r[0]);

    const res = await app.request(
      `http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          transactions: [
            { seasonId: '25-26', type: 'depense', accountId: 'current', category: 7, amount: 200000, date: '2026-07-15', paymentMethod: 'virement', description: 'Salaire brut' },
            { seasonId: '25-26', type: 'recette', accountId: 'current', category: 8, amount: 6007, date: '2026-07-15', paymentMethod: 'virement', description: 'Retenue cotisation' }
          ]
        })
      },
      { DB: mockD1 as any }
    );

    expect(res.status).toBe(200);

    const ligne = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(ligne.status).toBe('reconciled');
  });

  it('POST /accounting/bank-statement-lines/:id/reconcile successfully matches a single bank transaction to multiple invoiceIds', async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create 2 invoices
    const inv1 = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0101',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client 1',
      totalAmountCents: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const inv2 = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0102',
      seasonId: 1,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client 2',
      totalAmountCents: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-MULTI-MATCH',
      accountId: 1,
      seasonId: 1,
      amountCents: 30000,
      date: '2026-07-15',
      name: 'VIR RECU MULTI',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Send multi-match reconcile request
    const res = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceIds: [inv1.id, inv2.id],
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 30000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Multi-match'
        }
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);

    // Verify invoices are marked as paid and linked to bank transaction
    const updatedInv1 = (await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv1.id)).get())!;
    const updatedInv2 = (await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv2.id)).get())!;
    expect(updatedInv1!.status).toBe('paid');
    expect(updatedInv1!.bankStatementLineId).toBe(bt.id);
    expect(updatedInv2!.status).toBe('paid');
    expect(updatedInv2!.bankStatementLineId).toBe(bt.id);

    // Verify bank transaction is reconciled
    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt!.status).toBe('reconciled');
  });

  it("POST /accounting/bank-statement-lines/:id/reconcile ventile une ligne en deux écritures sans toucher au règlement de l'adhérent", async () => {
    const { mockD1, db } = await setupMockDb();

    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a member who has NOT paid fully
    const m = await insertMemberFixture(db, {
      id: 30,
      licence: '1234599',
      seasonId: 1,
      lastName: 'Martin',
      firstName: 'Sophie',
      gender: 'F',
      birthDate: '1995-03-15',
      status: 'valide',
      type: 'Competiteur',
      amountDueCents: 25000,
      amountReceivedCents: 0,
      amountRemainingCents: 25000,
      paid: false,
      importedAt: new Date()
    });

    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-SPLIT-MEMBER',
      accountId: 1,
      seasonId: 1,
      amountCents: 15000,
      date: '2026-07-15',
      name: 'VIR RECU SPLIT MEMBER',
      status: 'pending',
      createdAt: new Date()
    } as any).returning().then(r => r[0]);

    // Send split reconcile request where:
    // - One transaction belongs to category 1 (adhesions_inscriptions) with amount 10000
    // - One transaction belongs to category 7 (cordage_vente) with amount 5000
    const res = await app.request(`http://localhost/accounting/bank-statement-lines/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        memberId: m.id,
        transactions: [
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 1, // membership category
            amount: 10000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Cotisation Split'
          },
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 7, // cordage_vente (not membership)
            amount: 5000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Cordage Split'
          }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);

    /*
      La part « Adhésions » de la ventilation était ajoutée au règlement de l'adhérent.

      Elle ne l'est plus : `memberships` vient de l'export Poona, qui l'écrase à chaque
      import. Ce chemin-ci est celui de la ventilation, que le contrôle de règle
      (`membership-payment-authority.test.ts`) ne couvre pas — il vaut donc d'être fixé ici.
    */
    const updatedMember = (await db.select().from(membershipsTable).where(eq(membershipsTable.id, m.id)).get())!;
    expect(updatedMember!.amountReceivedCents).toBe(0);
    expect(updatedMember!.amountRemainingCents).toBe(25000);
    expect(updatedMember!.paid).toBe(false);

    // Verify bank transaction is reconciled
    const updatedBt = (await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bt.id)).get())!;
    expect(updatedBt!.status).toBe('reconciled');
  });
});
