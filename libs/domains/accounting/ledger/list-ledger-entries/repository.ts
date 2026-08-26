import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { and, or, eq, sql, inArray, isNull, desc, like } from 'drizzle-orm';
import { accountClassesTable, bankStatementLinesTable, seasonBalancesTable } from '../../shared/schema';
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
    if (filters.classCode) {
      /*
       * La classe est désignée par son **code** (`60`, `70`, `512`…), pas par son identifiant.
       *
       * Ce filtre comparait `Number(filters.classCode)` aux colonnes
       * `receipt_account_class_id` / `expense_account_class_id`, qui portent des identifiants de
       * ligne (1 à 12). `Number('60')` ne correspondait donc à aucune classe, la liste des
       * catégories ressortait vide, et la condition retombait sur `1 = 0` : cliquer sur une classe
       * depuis le compte de résultat ouvrait un grand livre vide. Il ne l'a jamais fait autrement.
       */
      const accountClass = await db.select()
        .from(accountClassesTable)
        .where(or(
          eq(accountClassesTable.code, String(filters.classCode)),
          eq(accountClassesTable.id, Number(filters.classCode) || -1)
        ))
        .get();

      if (!accountClass) {
        conditions.push(sql`1 = 0`);
      } else {
        /*
         * Une classe n'a qu'un sens, et le filtre le suit.
         *
         * « Volants » se rattache au 70 en produit et au 60 en charge : chercher la classe des
         * deux côtés ramenait ses recettes ET ses dépenses. Cliquer sur « 60 - Achats » depuis la
         * colonne des charges doit montrer des achats, pas des ventes de volants.
         */
        const side = accountClass.type === 'recette'
          ? categoriesTable.receiptAccountClassId
          : categoriesTable.expenseAccountClassId;

        const matchingCats = await db.select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(eq(side, accountClass.id))
          .all();
        const catIds = matchingCats.map((cat) => cat.id);

        if (catIds.length === 0) {
          conditions.push(sql`1 = 0`);
        } else {
          conditions.push(inArray(ledgerEntriesTable.categoryId, catIds));
          if (accountClass.type === 'recette' || accountClass.type === 'depense') {
            conditions.push(eq(ledgerEntriesTable.type, accountClass.type));
          }
        }
      }
    }

    return conditions;
  }

  async count(db: DbOrTx, filters: ListTransactionsFilters): Promise<number> {
    const conditions = await this.buildConditions(db, filters);
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(ledgerEntriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get();
    return countRes?.count || 0;
  }

  /**
   * Les écritures d'une page du grand livre.
   *
   * `runningBalance: false` retire les deux colonnes dérivées — le solde progressif et le
   * compte d'en face — ainsi que les trois requêtes qui les préparent. Toutes deux sont des
   * sous-requêtes **corrélées**, réévaluées pour chaque ligne rendue : sur les 2000 écritures
   * que l'écran de rapprochement demandait, le solde progressif seul balaie la table une fois
   * par ligne. Or ni l'une ni l'autre n'est affichée ailleurs qu'au grand livre.
   *
   * Le défaut reste `true` : un appelant qui ne sait pas ce qu'il veut obtient la vue complète.
   */
  async list(db: DbOrTx, filters: ListTransactionsFilters, pagination: { limit: number; offset: number; runningBalance?: boolean }): Promise<any[]> {
    const conditions = await this.buildConditions(db, filters);
    const withRunningBalance = pagination.runningBalance !== false;

    let derivedColumns: Record<string, any> = {};
    if (withRunningBalance) {
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

      derivedColumns = {
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
      };
    }

    const txs = await db.select({
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
      ...derivedColumns
    } as any)
      .from(ledgerEntriesTable)
      .leftJoin(bankStatementLinesTable, eq(ledgerEntriesTable.bankStatementLineId, bankStatementLinesTable.id))
      .leftJoin(paymentMethodsTable, eq(ledgerEntriesTable.paymentMethodId, paymentMethodsTable.id))
      .leftJoin(categoriesTable, eq(ledgerEntriesTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntriesTable.date), desc(ledgerEntriesTable.id))
      .limit(pagination.limit)
      .offset(pagination.offset)
      /* La projection étant assemblée en deux morceaux, Drizzle ne peut plus en déduire la forme
         de la ligne : on la nomme ici plutôt que de la laisser retomber sur celle des jointures. */
      .all() as unknown as { memberId: number | null; [key: string]: any }[];

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
