import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import {
  seasonsTable,
  ledgerEntriesTable,
  internalTransfersTable,
  bankStatementLinesTable,
  bankStatementBalancesTable,
  accountsTable
} from '../../shared/schema';
import { createInternalTransfer } from './handler';
import { createLedgerEntry } from '../create-ledger-entry/handler';
import { deleteLedgerEntry } from '../delete-ledger-entry/handler';
import { getReconciliationStatement } from '../../bank/get-reconciliation-statement/handler';
import { computeAccountBalances } from '../../shared/balances';

/**
 * Le virement interne, en deux jambes.
 *
 * Ces tests tournent sur la base réelle et son seed : c'est lui qui porte les identifiants des
 * comptes et des modes de règlement, et l'invariant du virement est une contrainte SQL — le
 * vérifier contre un double n'aurait rien prouvé.
 */
describe('createInternalTransfer', () => {
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

  it('écrit un parent et deux jambes, en une seule fois', async () => {
    const transfer = await createInternalTransfer(db, base);

    expect(transfer.reference).toBe('VIR-25-26-0001');
    expect(transfer.legs).toHaveLength(2);

    const legs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, transfer.id)).all();
    const source = legs.find((l: any) => l.transferLeg === 'source');
    const destination = legs.find((l: any) => l.transferLeg === 'destination');

    expect(source.accountId).toBe(await accountId('current'));
    expect(destination.accountId).toBe(await accountId('savings'));
    // Le montant reste positif des deux côtés : c'est la jambe qui porte le sens, jamais le signe.
    expect(source.amountCents).toBe(500_000);
    expect(destination.amountCents).toBe(500_000);
    // Un virement ne porte pas de catégorie : il ne pèse pas sur le résultat.
    expect(source.categoryId).toBeNull();
    expect(destination.categoryId).toBeNull();
  });

  it('numérote les virements par exercice', async () => {
    await createInternalTransfer(db, base);
    const second = await createInternalTransfer(db, { ...base, description: 'Encore' });
    expect(second.reference).toBe('VIR-25-26-0002');
  });

  it("donne à chaque jambe sa propre date de valeur", async () => {
    // Sorti de la caisse le lundi, crédité en banque le jeudi.
    const transfer = await createInternalTransfer(db, {
      ...base,
      sourceAccountId: 'cash',
      destinationAccountId: 'current',
      sourceDate: '2026-03-09',
      destinationDate: '2026-03-12'
    });

    const legs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, transfer.id)).all();
    expect(legs.find((l: any) => l.transferLeg === 'source').date).toBe('2026-03-09');
    expect(legs.find((l: any) => l.transferLeg === 'destination').date).toBe('2026-03-12');
  });

  it("naît `cleared` des deux côtés, quel que soit le formulaire", async () => {
    /*
     * Le moyen de paiement est imposé, et non hérité de l'écran. Un virement récupérait sinon
     * celui resté dans le formulaire — donc parfois un `default_entry_status` à `in_vault`, qui
     * n'a aucun sens pour un virement et que le calcul de solde écartait sans le dire.
     */
    const transfer = await createInternalTransfer(db, base);
    const legs = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transferId, transfer.id)).all();
    for (const leg of legs) expect(leg.status).toBe('cleared');
  });

  it('ne crée ni ne détruit de trésorerie', async () => {
    await createInternalTransfer(db, base);

    const accounts = await db.select().from(accountsTable).all();
    const entries = await db.select().from(ledgerEntriesTable).all();
    const balances = computeAccountBalances(accounts, [], entries);

    expect(balances.find((b) => b.accountCode === 'current')!.grossCents).toBe(-500_000);
    expect(balances.find((b) => b.accountCode === 'savings')!.grossCents).toBe(500_000);
    expect(balances.reduce((sum, b) => sum + b.grossCents, 0)).toBe(0);
  });

  it('refuse un virement vers le compte source', async () => {
    await expect(createInternalTransfer(db, { ...base, destinationAccountId: 'current' }))
      .rejects.toThrow('Le compte destinataire doit être différent du compte source.');
  });

  it("refuse un crédit antérieur au débit", async () => {
    await expect(createInternalTransfer(db, { ...base, destinationDate: '2026-01-09' }))
      .rejects.toThrow(/ne peut pas arriver avant/);
  });

  it('refuse un compte inconnu', async () => {
    await expect(createInternalTransfer(db, { ...base, destinationAccountId: 'coffre-fort' }))
      .rejects.toThrow(/introuvable/);
  });

  it('refuse un compte blanc au lieu de retomber sur un compte par défaut', async () => {
    /*
     * `resolveAccountId` replie l'absence de valeur sur un compte par défaut. Une chaîne d'espaces
     * passait le test de présence du handler, était trimée, et le virement partait vers ce compte
     * par défaut — de l'argent déplacé vers un compte que personne n'avait désigné.
     */
    await expect(createInternalTransfer(db, { ...base, destinationAccountId: '   ' }))
      .rejects.toThrow(/doit être désigné explicitement/);
  });

  it("n'écrit rien du tout si le batch échoue", async () => {
    await expect(createInternalTransfer(db, { ...base, seasonId: '999' })).rejects.toThrow();

    expect(await db.select().from(internalTransfersTable).all()).toHaveLength(0);
    expect(await db.select().from(ledgerEntriesTable).all()).toHaveLength(0);
  });
});

describe('le grand livre refuse désormais le type transfert', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
  });

  it('renvoie un message plutôt qu\'une violation de contrainte', async () => {
    /*
     * Sans cette garde, l'écriture partait en base et le CHECK la rejetait : une erreur D1 brute
     * en 500, illisible pour qui la reçoit.
     */
    await expect(createLedgerEntry(db, {
      seasonId: '1', type: 'transfert', accountId: 'current',
      amount: 5000, date: '2025-10-01', paymentMethod: 'virement', description: 'x'
    } as any)).rejects.toThrow('/accounting/internal-transfers');
  });
});

describe('supprimer une jambe supprime le virement entier', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
  });

  it('retire les deux écritures et leur parent', async () => {
    const transfer = await createInternalTransfer(db, {
      seasonId: '1', sourceAccountId: 'current', destinationAccountId: 'savings',
      amountCents: 500_000, sourceDate: '2026-01-10', description: 'Vers le livret'
    });

    await deleteLedgerEntry(db, transfer.legs[0].id);

    expect(await db.select().from(ledgerEntriesTable).all()).toHaveLength(0);
    expect(await db.select().from(internalTransfersTable).all()).toHaveLength(0);
  });
});

describe("rapprochement d'un virement entre deux comptes bancaires", () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026',
      startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
  });

  it('boucle sur les DEUX comptes une fois les deux jambes pointées', async () => {
    /*
     * Le scénario que l'ancien modèle rendait impossible.
     *
     * Un virement courant↔livret produit deux lignes de relevé, les deux comptes étant importés en
     * OFX. `ledger_entries.bank_statement_line_id` étant scalaire, une écriture unique ne pouvait
     * en pointer qu'une : côté livret, elle sortait des « écritures non pointées » pendant que sa
     * ligne restait « non comptabilisée », d'où un écart permanent de −montant. Ne rien pointer
     * faisait boucler l'identité, mais laissait la ligne en `pending` — ce qui **bloquait la
     * clôture**. Il n'existait aucune façon correcte de saisir ce virement.
     */
    const currentId = (await db.select().from(accountsTable).where(eq(accountsTable.code, 'current')).get()).id;
    const savingsId = (await db.select().from(accountsTable).where(eq(accountsTable.code, 'savings')).get()).id;

    await db.insert(bankStatementLinesTable).values([
      { id: 1, fitid: 'F1', accountId: currentId, amountCents: -500_000, date: '2026-01-10', name: 'VIR LIVRET', status: 'reconciled', createdAt: new Date() },
      { id: 2, fitid: 'F2', accountId: savingsId, amountCents: 500_000, date: '2026-01-10', name: 'VIR RECU', status: 'reconciled', createdAt: new Date() }
    ]);
    await db.insert(bankStatementBalancesTable).values([
      { accountId: currentId, date: '2026-01-31', balanceCents: -500_000, createdAt: new Date() },
      { accountId: savingsId, date: '2026-01-31', balanceCents: 500_000, createdAt: new Date() }
    ]);

    const transfer = await createInternalTransfer(db, {
      seasonId: '1', sourceAccountId: 'current', destinationAccountId: 'savings',
      amountCents: 500_000, sourceDate: '2026-01-10', description: 'Vers le livret'
    });

    // Chaque jambe pointe SA ligne de relevé : c'est tout l'objet du modèle à deux jambes.
    const source = transfer.legs.find((l) => l.transferLeg === 'source')!;
    const destination = transfer.legs.find((l) => l.transferLeg === 'destination')!;
    await db.update(ledgerEntriesTable).set({ bankStatementLineId: 1 }).where(eq(ledgerEntriesTable.id, source.id));
    await db.update(ledgerEntriesTable).set({ bankStatementLineId: 2 }).where(eq(ledgerEntriesTable.id, destination.id));

    const onCurrent = await getReconciliationStatement(db, { accountCode: 'current', seasonId: '1', date: '2026-01-31' });
    const onSavings = await getReconciliationStatement(db, { accountCode: 'savings', seasonId: '1', date: '2026-01-31' });

    expect(onCurrent.gapCents).toBe(0);
    expect(onSavings.gapCents).toBe(0);
    expect(onCurrent.halfPointedTransferIds).toEqual([]);
    expect(onSavings.halfPointedTransferIds).toEqual([]);
  });
});
