import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, and, lte, gte } from 'drizzle-orm';
import { getMembersByIds } from '@nba/members-api';
import { bankStatementLinesTable, invoicesTable } from '../../shared/schema';

export class ReconcileBankStatementLineRepository {
  async getSeasonIdByDate(db: DbOrTx, date: string): Promise<number | undefined> {
    if (!date) return undefined;
    const row = await db.select({ id: seasonsTable.id })
      .from(seasonsTable)
      .where(and(lte(seasonsTable.startDate, date), gte(seasonsTable.endDate, date)))
      .get();
    return row?.id;
  }

  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }
  async getBankStatementLineById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, id)).get();
  }

  async getInvoiceById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  buildLinkTransactionToBankStatement(db: DbOrTx, ledgerEntryId: number, bankStatementLineId: number, memberId?: number): any {
    return db.update(ledgerEntriesTable)
      .set({
        bankStatementLineId,
        memberId: memberId || undefined,
        /*
         * Pointer une écriture contre une ligne de relevé prouve que l'argent est arrivé en
         * banque : son statut d'attente n'a plus d'objet.
         *
         * Sans cette ligne, un chèque saisi `in_vault` puis rapproché gardait son statut pour
         * toujours, et le solde bancaire théorique aurait retranché son montant indéfiniment —
         * un écart qui se serait creusé chèque après chèque, sans que rien ne le signale.
         */
        status: 'cleared'
      })
      .where(eq(ledgerEntriesTable.id, ledgerEntryId));
  }

  /*
   * Les identifiants arrivent déjà résolus : le bâtisseur est synchrone parce qu'il alimente un
   * `db.batch()`, et ne peut donc pas interroger la base. C'est `buildReconciliationStatements`
   * qui appelle `resolveAccountId` / `resolvePaymentMethod` avant de l'appeler — les tables de
   * correspondance codées en dur qui vivaient ici étaient décalées d'un cran à partir de
   * `labaz`, le seed intercalant `cb` en quatrième position.
   */
  buildCreateLedgerEntryStatement(db: DbOrTx, values: any): any {
    const rawAcc = values.accountId;
    const accountIdNum = typeof rawAcc === 'number' ? rawAcc : (isNaN(Number(rawAcc)) ? 1 : Number(rawAcc));

    const rawPay = values.paymentMethodId ?? values.paymentMethod;
    const paymentMethodIdNum = typeof rawPay === 'number' ? rawPay : (isNaN(Number(rawPay)) ? 1 : Number(rawPay));

    const rawCat = values.categoryId ?? values.category;
    const categoryIdNum = rawCat !== undefined && rawCat !== null ? (typeof rawCat === 'number' ? rawCat : (isNaN(Number(rawCat)) ? 1 : Number(rawCat))) : null;

    const rawSeason = values.seasonId;
    const seasonIdNum = typeof rawSeason === 'number' ? rawSeason : (isNaN(Number(rawSeason)) ? 1 : Number(rawSeason));

    return db.insert(ledgerEntriesTable).values({
      seasonId: seasonIdNum,
      type: values.type,
      accountId: accountIdNum,
      categoryId: categoryIdNum,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      date: values.date,
      paymentMethodId: paymentMethodIdNum,
      description: values.description,
      reference: values.reference || null,
      accrualType: values.accrualType || 'normal',
      accrualNote: values.accrualNote || null,
      memberId: values.memberId || null,
      invoiceId: values.invoiceId || null,
      bankStatementLineId: values.bankStatementLineId || null,
      createdAt: values.createdAt || new Date()
    });
  }

  buildMarkInvoiceAsPaidStatement(db: DbOrTx, id: number, bankStatementLineId: number): any {
    return db.update(invoicesTable)
      .set({ status: 'paid', bankStatementLineId })
      .where(eq(invoicesTable.id, id));
  }

  buildMarkBankStatementLineReconciledStatement(db: DbOrTx, id: number): any {
    return db.update(bankStatementLinesTable)
      .set({ status: 'reconciled' })
      .where(eq(bankStatementLinesTable.id, id));
  }

  async linkTransactionToBank(db: DbOrTx, ledgerEntryId: number, bankStatementLineId: number, memberId?: number): Promise<void> {
    await db.update(ledgerEntriesTable)
      .set({ 
        bankStatementLineId,
        memberId: memberId || undefined
      })
      .where(eq(ledgerEntriesTable.id, ledgerEntryId))
      .run();
  }

  async createLedgerEntry(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }

  async markInvoiceAsPaid(db: DbOrTx, id: number, bankStatementLineId: number): Promise<void> {
    await db.update(invoicesTable)
      .set({ status: 'paid', bankStatementLineId })
      .where(eq(invoicesTable.id, id))
      .run();
  }

  /**
   * Les écritures liées à une ligne de relevé, dans la forme que l'écran connaît déjà.
   *
   * C'est **la** projection de `list-ledger-entries` — `amount` en centimes, `category` portant
   * le libellé, `memberName` reconstitué — moins le solde progressif et le compte d'en face, que
   * cet écran n'affiche pas. Elle existe pour que le rapprochement puisse répondre ce qu'il vient
   * d'écrire : sans cela l'écran n'a pas d'autre moyen de se mettre à jour qu'un rechargement
   * complet de la page.
   *
   * Toute colonne ajoutée ici doit l'être à l'identique dans `list-ledger-entries` : deux formes
   * pour une même écriture selon qu'elle arrive du serveur ou d'un rapprochement, et l'affichage
   * change sous les yeux de la comptable sans qu'aucune donnée n'ait bougé.
   */
  async getLinkedLedgerEntriesForUi(db: DbOrTx, bankStatementLineId: number): Promise<any[]> {
    const rows = await db.select({
        id: ledgerEntriesTable.id,
        seasonId: ledgerEntriesTable.seasonId,
        type: ledgerEntriesTable.type,
        accountId: ledgerEntriesTable.accountId,
        transferId: ledgerEntriesTable.transferId,
        transferLeg: ledgerEntriesTable.transferLeg,
        category: categoriesTable.adminLabel,
        categoryId: ledgerEntriesTable.categoryId,
        amount: ledgerEntriesTable.amountCents,
        date: ledgerEntriesTable.date,
        description: ledgerEntriesTable.description,
        reference: ledgerEntriesTable.reference,
        memberId: ledgerEntriesTable.memberId,
        invoiceId: ledgerEntriesTable.invoiceId,
        bankStatementLineId: ledgerEntriesTable.bankStatementLineId,
        accrualType: ledgerEntriesTable.accrualType,
        accrualNote: ledgerEntriesTable.accrualNote,
        status: ledgerEntriesTable.status
      })
      .from(ledgerEntriesTable)
      .leftJoin(categoriesTable, eq(ledgerEntriesTable.categoryId, categoriesTable.id))
      .where(eq(ledgerEntriesTable.bankStatementLineId, bankStatementLineId))
      .all();

    const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter((id): id is number => id !== null)));
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return rows.map((r) => {
      const m = r.memberId ? membersMap.get(r.memberId) : null;
      return {
        ...r,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }

  async getLedgerEntriesForBankStatementLine(db: DbOrTx, bankStatementLineId: number): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.bankStatementLineId, bankStatementLineId))
      .all();
  }

  async markBankStatementLineReconciled(db: DbOrTx, id: number): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ status: 'reconciled' })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
