import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { and, or, eq, sql, inArray, isNull, desc, like } from 'drizzle-orm';
import { bankStatementLinesTable, seasonBalancesTable } from '../../shared/schema';
import { getMembersByIds } from '@nba/members-api';
import type { ListTransactionsFilters } from './dto';
import { resolveAccountId } from '../../config/queries';

export class ListTransactionsRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  private async buildConditions(db: DbOrTx, filters: ListTransactionsFilters) {
    const conditions = [];
    if (filters.seasonId) {
      const seasonIdInt = await this.resolveSeasonId(db, filters.seasonId);
      const season = await db.select().from(seasonsTable).where(eq(seasonsTable.id, seasonIdInt)).get();
      if (season) {
        conditions.push(or(
          eq(ledgerEntriesTable.seasonId, seasonIdInt),
          and(
            sql`${ledgerEntriesTable.date} >= ${season.startDate}`,
            sql`${ledgerEntriesTable.date} <= ${season.endDate}`
          )
        ) as any);
      } else {
        conditions.push(eq(ledgerEntriesTable.seasonId, seasonIdInt));
      }
    }
    if (filters.accountId) {
      /*
       * Une seule colonne à interroger désormais : chaque écriture ne touche qu'un compte, celui
       * qu'elle nomme. Le `OR ... destination_account_id` n'a plus d'objet — la jambe créditrice
       * d'un virement est une écriture à part entière, sur son propre compte.
       */
      const accId = await resolveAccountId(db, filters.accountId);
      conditions.push(eq(ledgerEntriesTable.accountId, accId));
    }
    if (filters.type) {
      conditions.push(eq(ledgerEntriesTable.type, filters.type as any));
    }
    if (filters.category) {
      conditions.push(eq(ledgerEntriesTable.categoryId, parseInt(filters.category)));
    }
    if (filters.memberId) {
      conditions.push(eq(ledgerEntriesTable.memberId, parseInt(filters.memberId)));
    }
    if (filters.unreconciledChequesOnly) {
      conditions.push(
        eq(ledgerEntriesTable.paymentMethodId, 2),
        isNull(ledgerEntriesTable.bankStatementLineId)
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(or(
        like(ledgerEntriesTable.description, term),
        like(ledgerEntriesTable.reference, term)
      ) as any);
    }
    if (filters.month) {
      conditions.push(like(ledgerEntriesTable.date, `%-${filters.month}-%`));
    }
    return conditions;
  }

  async count(db: DbOrTx, filters: ListTransactionsFilters): Promise<number> {
    const conditions = await this.buildConditions(db, filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptAccountClassId, Number(filters.classCode)), eq(categoriesTable.expenseAccountClassId, Number(filters.classCode))))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.categoryId, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(ledgerEntriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get();
    return countRes?.count || 0;
  }

  async list(db: DbOrTx, filters: ListTransactionsFilters, pagination: { limit: number; offset: number }): Promise<any[]> {
    const conditions = await this.buildConditions(db, filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptAccountClassId, Number(filters.classCode)), eq(categoriesTable.expenseAccountClassId, Number(filters.classCode))))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.categoryId, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    /*
     * Le compte du solde progressif, résolu en base.
     *
     * La table `{ current: 1, savings: 2, cash: 3 }` qui tenait ici ne valait que pour l'ordre du
     * seed d'origine, et retombait sur le compte courant devant un code inconnu — le solde
     * progressif d'un compte inexistant s'affichait alors comme celui du courant, sans un mot.
     */
    const accId = filters.accountId ? await resolveAccountId(db, filters.accountId) : await resolveAccountId(db, null);

    let initialBalance = 0;
    let seasonStartDate = '';
    if (filters.seasonId) {
      const seasonIdInt = await this.resolveSeasonId(db, filters.seasonId);
      const balanceRow = await db.select({ 
          initialBalanceCents: seasonBalancesTable.initialBalanceCents,
          startDate: seasonsTable.startDate
        })
        .from(seasonBalancesTable)
        .innerJoin(seasonsTable, eq(seasonBalancesTable.seasonId, seasonsTable.id))
        .where(and(eq(seasonBalancesTable.seasonId, seasonIdInt), eq(seasonBalancesTable.accountId, accId)))
        .get();
      if (balanceRow) {
        initialBalance = balanceRow.initialBalanceCents;
        seasonStartDate = balanceRow.startDate;
      }
    }

    const trueInitialBalance = initialBalance;

    const txs = await db.select({
      id: ledgerEntriesTable.id,
      seasonId: ledgerEntriesTable.seasonId,
      type: ledgerEntriesTable.type,
      accountId: ledgerEntriesTable.accountId,
      transferId: ledgerEntriesTable.transferId,
      transferLeg: ledgerEntriesTable.transferLeg,
      /*
       * Le compte d'en face, lu sur la jambe jumelle. Le grand livre doit pouvoir écrire
       * « Compte Courant → Livret A » sur chacune des deux lignes : sans lui, un virement entrant
       * et un virement sortant sont indiscernables à l'écran.
       */
      counterpartAccountId: sql<number | null>`(
        SELECT other.account_id FROM ledger_entries other
        WHERE other.transfer_id = ${ledgerEntriesTable.transferId}
          AND other.id <> ${ledgerEntriesTable.id}
      )`,
      category: categoriesTable.adminLabel,
      categoryId: ledgerEntriesTable.categoryId,
      amount: ledgerEntriesTable.amountCents,
      date: ledgerEntriesTable.date,
      paymentMethod: paymentMethodsTable.code,
      description: ledgerEntriesTable.description,
      reference: sql<string>`COALESCE(${bankStatementLinesTable.memo}, ${bankStatementLinesTable.name}, ${ledgerEntriesTable.reference})`,
      memberId: ledgerEntriesTable.memberId,
      bankStatementLineId: ledgerEntriesTable.bankStatementLineId,
      /*
       * Le rattachement d'exercice fait partie de l'écriture, pas de sa saisie.
       *
       * La projection l'omettait : le grand livre affichait « Normal » sur une écriture
       * pourtant marquée en produit constaté d'avance, et — bien pire — rouvrir puis
       * réenregistrer cette écriture renvoyait `accrualType: 'normal'` au serveur, qui
       * l'écrivait. Un cut-off correctement saisi disparaissait à la première
       * modification, sans message et sans trace.
       */
      accrualType: ledgerEntriesTable.accrualType,
      accrualNote: ledgerEntriesTable.accrualNote,
      /*
       * Le statut fait partie de l'écriture, et la projection l'omettait.
       *
       * C'est lui qui sépare le solde comptable du solde bancaire théorique (`in_vault`,
       * `pending_debit`). Sans lui, le grand livre ne pouvait afficher que le premier, et rouvrir
       * une écriture pour la réenregistrer renvoyait un statut absent au serveur.
       */
      status: ledgerEntriesTable.status,
      runningBalanceCents: sql<number>`CAST(${trueInitialBalance} + COALESCE((
        SELECT SUM(
          CASE
            WHEN le2.type = 'recette' THEN le2.amount_cents
            WHEN le2.type = 'depense' THEN -le2.amount_cents
            WHEN le2.type = 'transfert' AND le2.transfer_leg = 'source' THEN -le2.amount_cents
            WHEN le2.type = 'transfert' AND le2.transfer_leg = 'destination' THEN le2.amount_cents
            ELSE 0
          END
        )
        FROM ledger_entries le2
        WHERE le2.account_id = ${accId}
          AND (le2.date < ${ledgerEntriesTable.date} OR (le2.date = ${ledgerEntriesTable.date} AND le2.id <= ${ledgerEntriesTable.id}))
          ${seasonStartDate ? sql`AND le2.date >= ${seasonStartDate}` : sql``}
      ), 0) AS INTEGER)`.mapWith(Number)
    })
      .from(ledgerEntriesTable)
      .leftJoin(bankStatementLinesTable, eq(ledgerEntriesTable.bankStatementLineId, bankStatementLinesTable.id))
      .leftJoin(paymentMethodsTable, eq(ledgerEntriesTable.paymentMethodId, paymentMethodsTable.id))
      .leftJoin(categoriesTable, eq(ledgerEntriesTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntriesTable.date), desc(ledgerEntriesTable.id))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();

    const memberIds = Array.from(new Set(txs.map((t) => t.memberId).filter((id) => id !== null))) as number[];
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return txs.map((t) => {
      const m = t.memberId ? membersMap.get(t.memberId) : null;
      return {
        ...t,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }
}
