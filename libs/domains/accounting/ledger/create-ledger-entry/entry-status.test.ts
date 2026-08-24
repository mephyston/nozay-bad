import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable, ledgerEntriesTable, paymentMethodsTable, bankStatementLinesTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { createLedgerEntry } from './handler';
import { updateLedgerEntry } from '../update-ledger-entry/handler';

/**
 * Le statut d'une écriture vient du mode de règlement, et de nulle part ailleurs.
 *
 * Ces tests tournent sur la base réelle et son seed de référence : c'est lui qui porte les
 * identifiants des comptes et des modes de règlement, et les deux régressions couvertes ici
 * venaient précisément de tables de correspondance recopiées à la main à côté de ce seed.
 */
describe("statut et rattachement d'une écriture", () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    });
  });

  const baseEntry = {
    seasonId: '1',
    type: 'recette' as const,
    accountId: 'current',
    category: '1',
    amount: 5000,
    date: '2025-10-01',
    description: 'Cotisation'
  };

  it("fait naître un virement `cleared`", async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, paymentMethod: 'virement' });
    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    expect(row.status).toBe('cleared');
  });

  /*
   * `payment_methods.default_entry_status` dit depuis toujours qu'un chèque naît `in_vault`.
   * Le handler forçait `cleared`, si bien qu'aucune écriture n'a jamais porté d'autre statut —
   * et que le solde bancaire théorique, qui s'en déduit, ne pouvait jamais différer du solde
   * comptable. Le mécanisme existait ; rien ne l'alimentait.
   */
  it('fait naître un chèque `in_vault`', async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, paymentMethod: 'cheque' });
    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    expect(row.status).toBe('in_vault');
  });

  /*
   * La table codée en dur était décalée d'un cran à partir de `labaz`, le seed intercalant `cb`
   * en quatrième position : un chèque LABAZ s'enregistrait en carte bancaire, et héritait donc
   * du `cleared` de la carte au lieu de l'`in_vault` du chèque LABAZ.
   */
  it('rattache un chèque LABAZ au bon mode de règlement', async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, paymentMethod: 'labaz' });
    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    const method = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, row.paymentMethodId)).get();

    expect(method.code).toBe('labaz');
    expect(row.status).toBe('in_vault');
  });

  it("résout le compte par son code, pas par une correspondance codée en dur", async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, accountId: 'cash', paymentMethod: 'especes' });
    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    expect(row.accountId).toBe(3);
  });

  it('refuse un compte inconnu au lieu de retomber sur le compte courant', async () => {
    await expect(createLedgerEntry(db, { ...baseEntry, accountId: 'livret-b', paymentMethod: 'virement' }))
      .rejects.toThrow('introuvable');
  });

  it("recalcule le statut d'une écriture non pointée dont le règlement change", async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, paymentMethod: 'virement' });
    await updateLedgerEntry(db, id, { ...baseEntry, paymentMethod: 'cheque' } as any);

    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    expect(row.status).toBe('in_vault');
  });

  /*
   * Une écriture déjà pointée a été confrontée à une ligne de relevé : la banque a parlé, et une
   * correction de libellé ne doit pas défaire ce constat.
   */
  it("laisse son statut à une écriture déjà pointée", async () => {
    const { id } = await createLedgerEntry(db, { ...baseEntry, paymentMethod: 'virement' });
    const line = await db.insert(bankStatementLinesTable).values({
      fitid: 'FIT-1',
      accountId: 1,
      amountCents: 5000,
      date: '2025-10-02',
      name: 'Virement reçu',
      status: 'reconciled',
      createdAt: new Date()
    }).returning().get();
    await db.update(ledgerEntriesTable)
      .set({ bankStatementLineId: line.id, status: 'cleared' })
      .where(eq(ledgerEntriesTable.id, id));

    await updateLedgerEntry(db, id, { ...baseEntry, paymentMethod: 'cheque' } as any);

    const row = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
    expect(row.status).toBe('cleared');
  });
});
