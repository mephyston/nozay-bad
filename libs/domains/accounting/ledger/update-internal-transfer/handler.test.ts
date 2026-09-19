import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import {
  seasonsTable,
  ledgerEntriesTable,
  internalTransfersTable,
  bankStatementLinesTable,
  accountsTable
} from '../../shared/schema';
import { createInternalTransfer } from '../create-internal-transfer/handler';
import { updateInternalTransfer } from './handler';
import { computeAccountBalances } from '../../shared/balances';

/**
 * La correction d'un virement interne : le parent et ses deux jambes, d'un seul geste.
 *
 * Sur la base réelle et son seed, comme la création : les comptes et les modes de règlement en
 * viennent, et l'invariant « deux jambes, même montant » se vérifie sur les lignes écrites.
 */
describe('updateInternalTransfer', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
  });

  const base = {
    seasonId: '1',
    sourceAccountId: 'current',
    destinationAccountId: 'savings',
    amountCents: 500_000,
    sourceDate: '2026-01-10',
    description: 'Vers le livret'
  };

  const accountId = async (code: string) =>
    (await db.select().from(accountsTable).where(eq(accountsTable.code, code)).get()).id;

  const legsOf = async (transferId: number) => {
    const legs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, transferId)).all();
    return {
      source: legs.find((l: any) => l.transferLeg === 'source'),
      destination: legs.find((l: any) => l.transferLeg === 'destination')
    };
  };

  it('réécrit le montant, les dates et le libellé sur le parent et les deux jambes', async () => {
    const created = await createInternalTransfer(db, base);

    await updateInternalTransfer(db, created.id, {
      ...base,
      amountCents: 450_000,
      sourceDate: '2026-01-12',
      destinationDate: '2026-01-14',
      description: 'Vers le livret (corrigé)',
      reference: 'ORDRE 42'
    });

    const parent = await db.select().from(internalTransfersTable).where(eq(internalTransfersTable.id, created.id)).get();
    expect(parent.amountCents).toBe(450_000);
    expect(parent.description).toBe('Vers le livret (corrigé)');
    // La référence VIR-… du parent est un numéro d'ordre : elle ne bouge pas.
    expect(parent.reference).toBe(created.reference);

    const { source, destination } = await legsOf(created.id);
    expect(source.amountCents).toBe(450_000);
    expect(destination.amountCents).toBe(450_000);
    expect(source.date).toBe('2026-01-12');
    expect(destination.date).toBe('2026-01-14');
    expect(source.description).toBe('Vers le livret (corrigé)');
    expect(source.reference).toBe('ORDRE 42');
    expect(destination.reference).toBe('ORDRE 42');
    // Deux jambes toujours : rien n'a été dupliqué ni perdu.
    expect(await db.select().from(ledgerEntriesTable).all()).toHaveLength(2);
  });

  it('déplace le virement vers un autre compte des deux côtés', async () => {
    const created = await createInternalTransfer(db, base);

    await updateInternalTransfer(db, created.id, { ...base, destinationAccountId: 'cash' });

    const { source, destination } = await legsOf(created.id);
    expect(source.accountId).toBe(await accountId('current'));
    expect(destination.accountId).toBe(await accountId('cash'));
  });

  it('ne crée ni ne détruit de trésorerie', async () => {
    const created = await createInternalTransfer(db, base);
    await updateInternalTransfer(db, created.id, { ...base, amountCents: 123_456 });

    const accounts = await db.select().from(accountsTable).all();
    const entries = await db.select().from(ledgerEntriesTable).all();
    const balances = computeAccountBalances(accounts, [], entries);

    expect(balances.find((b) => b.accountCode === 'current')!.grossCents).toBe(-123_456);
    expect(balances.find((b) => b.accountCode === 'savings')!.grossCents).toBe(123_456);
    expect(balances.reduce((sum, b) => sum + b.grossCents, 0)).toBe(0);
  });

  it('refuse un virement inconnu', async () => {
    await expect(updateInternalTransfer(db, 9999, base)).rejects.toThrow('Virement introuvable.');
  });

  it('refuse le même compte des deux côtés', async () => {
    const created = await createInternalTransfer(db, base);
    await expect(updateInternalTransfer(db, created.id, { ...base, destinationAccountId: 'current' }))
      .rejects.toThrow('Le compte destinataire doit être différent du compte source.');
  });

  it("refuse un crédit antérieur au débit", async () => {
    const created = await createInternalTransfer(db, base);
    await expect(updateInternalTransfer(db, created.id, { ...base, destinationDate: '2026-01-09' }))
      .rejects.toThrow("L'argent ne peut pas arriver avant d'être parti");
  });

  it('refuse toute modification sur un exercice clôturé', async () => {
    const created = await createInternalTransfer(db, base);
    await db.update(seasonsTable).set({ closedAt: new Date() }).where(eq(seasonsTable.id, 1));

    await expect(updateInternalTransfer(db, created.id, { ...base, description: 'Trop tard' }))
      .rejects.toThrow('clôturée');
  });

  describe('une jambe pointée sur le relevé', () => {
    const pointSource = async (transferId: number) => {
      const currentId = await accountId('current');
      await db.insert(bankStatementLinesTable).values({
        id: 1, fitid: 'F1', accountId: currentId, amountCents: -500_000, date: '2026-01-10', name: 'VIR LIVRET', status: 'reconciled', createdAt: new Date()
      });
      const { source } = await legsOf(transferId);
      await db.update(ledgerEntriesTable).set({ bankStatementLineId: 1 }).where(eq(ledgerEntriesTable.id, source.id));
    };

    it('garde son montant : la couverture de la ligne en dépend', async () => {
      const created = await createInternalTransfer(db, base);
      await pointSource(created.id);

      await expect(updateInternalTransfer(db, created.id, { ...base, amountCents: 400_000 }))
        .rejects.toThrow('pointée sur le relevé : son montant ne se change plus');
    });

    it('garde son compte : la ligne appartient à ce compte-là', async () => {
      const created = await createInternalTransfer(db, base);
      await pointSource(created.id);

      await expect(updateInternalTransfer(db, created.id, { ...base, sourceAccountId: 'cash' }))
        .rejects.toThrow('pointée sur le relevé : son compte ne se change plus');
    });

    it("laisse corriger le libellé, la date et l'autre jambe, sans toucher au pointage", async () => {
      const created = await createInternalTransfer(db, base);
      await pointSource(created.id);

      await updateInternalTransfer(db, created.id, {
        ...base, destinationAccountId: 'cash', destinationDate: '2026-01-15', description: 'Vers la caisse, en fait'
      });

      const { source, destination } = await legsOf(created.id);
      expect(source.bankStatementLineId).toBe(1);
      expect(source.status).toBe('cleared');
      expect(source.description).toBe('Vers la caisse, en fait');
      expect(destination.accountId).toBe(await accountId('cash'));
      expect(destination.date).toBe('2026-01-15');
    });
  });
});
