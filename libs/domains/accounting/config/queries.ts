import { type DbOrTx, AppError } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountsTable, accountClassesTable, bankStatementBalancesTable, bankStatementLinesTable, paymentMethodsTable } from '../shared/schema';

export async function getAccountByCode(db: DbOrTx, code: string): Promise<typeof accountsTable.$inferSelect | undefined> {
  return db.select().from(accountsTable).where(eq(accountsTable.code, code)).get();
}

export interface AccountSummary {
  id: number;
  code: string;
  label: string;
  classCode: string;
  classType: 'recette' | 'depense' | 'tresorerie';
}

/** Tous les comptes du club, avec la classe qui les porte, dans l'ordre du seed. */
export async function listAccounts(db: DbOrTx): Promise<AccountSummary[]> {
  const rows = await db
    .select({
      id: accountsTable.id,
      code: accountsTable.code,
      label: accountsTable.label,
      classCode: accountClassesTable.code,
      classType: accountClassesTable.type
    })
    .from(accountsTable)
    .innerJoin(accountClassesTable, eq(accountClassesTable.id, accountsTable.accountClassId))
    .orderBy(accountsTable.id)
    .all();
  return rows as AccountSummary[];
}

/**
 * Les comptes dont on a importé un relevé — des lignes ou un solde annoncé.
 *
 * Les DEUX tables comptent, et c'est le point : n'exiger qu'un solde rendait l'état invisible
 * sur toute base alimentée avant que le `<LEDGERBAL>` ne soit capté. Les comptes déjà chargés
 * de centaines de lignes n'avaient aucun solde, donc aucun état — et l'écran, qui savait
 * pourtant dire « aucun solde de relevé importé », ne s'affichait tout simplement pas.
 *
 * Partagée entre l'état de rapprochement et la clôture : un compte sans relevé (la caisse, le
 * porte-monnaie Badnet) ne peut pointer aucune jambe de virement, et ne doit donc pas faire
 * signaler ses virements comme « à moitié pointés ».
 */
export async function listAccountsWithStatements(db: DbOrTx): Promise<{ id: number; code: string; label: string }[]> {
  const columns = { id: accountsTable.id, code: accountsTable.code, label: accountsTable.label };

  const withBalances = await db.selectDistinct(columns)
    .from(accountsTable)
    .innerJoin(bankStatementBalancesTable, eq(bankStatementBalancesTable.accountId, accountsTable.id))
    .all();

  const withLines = await db.selectDistinct(columns)
    .from(accountsTable)
    .innerJoin(bankStatementLinesTable, eq(bankStatementLinesTable.accountId, accountsTable.id))
    .all();

  const byId = new Map<number, { id: number; code: string; label: string }>();
  for (const account of [...withBalances, ...withLines]) byId.set(account.id, account);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export async function getPaymentMethodById(db: DbOrTx, id: number): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
  return db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).get();
}

export async function getPaymentMethodByCode(db: DbOrTx, code: string): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
  return db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.code, code)).get();
}

export async function listPaymentMethods(db: DbOrTx): Promise<(typeof paymentMethodsTable.$inferSelect)[]> {
  return db.select().from(paymentMethodsTable).all();
}

/**
 * L'identifiant d'un compte, qu'on lui passe son code ou son identifiant.
 *
 * Remplace les tables `{ current: 1, savings: 2, cash: 3 }` recopiées dans cinq fichiers :
 * elles ne valaient que pour l'ordre du seed d'origine et retombaient silencieusement sur le
 * compte courant devant un code inconnu.
 */
export async function resolveAccountId(db: DbOrTx, value: unknown, fallbackCode = 'current'): Promise<number> {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();

  if (raw !== '' && !isNaN(Number(raw))) return Number(raw);

  /*
   * Un code fourni et inconnu est refusé, jamais replié sur le compte par défaut. C'est tout
   * l'intérêt de résoudre en base : les correspondances codées en dur retombaient sur le compte
   * courant, si bien qu'une faute de frappe déplaçait l'argent d'un compte à l'autre en silence.
   * Le repli ne sert qu'à l'absence de valeur.
   */
  const account = raw !== ''
    ? await getAccountByCode(db, raw)
    : await getAccountByCode(db, fallbackCode);
  if (!account) {
    throw new AppError(`Compte de trésorerie « ${raw || fallbackCode} » introuvable.`, 400);
  }
  return account.id;
}

/**
 * La méthode de règlement, qu'on lui passe son code ou son identifiant.
 *
 * La table codée en dur qu'elle remplace était **décalée d'un cran** à partir de `labaz` :
 * le seed intercale `cb` en quatrième position, que la table ignorait. Saisir un chèque LABAZ
 * enregistrait donc une carte bancaire, un ANCV un chèque LABAZ, et ainsi de suite jusqu'au
 * bout de la liste — sans la moindre erreur, et en faisant perdre au passage le
 * `default_entry_status` de la vraie méthode.
 */
export async function resolvePaymentMethod(
  db: DbOrTx,
  value: unknown,
  fallbackCode = 'virement'
): Promise<typeof paymentMethodsTable.$inferSelect> {
  const byId = typeof value === 'number' && Number.isFinite(value)
    ? await getPaymentMethodById(db, value)
    : undefined;
  if (byId) return byId;

  const raw = String(value ?? '').trim();
  const numeric = raw !== '' && !isNaN(Number(raw)) ? await getPaymentMethodById(db, Number(raw)) : undefined;
  if (numeric) return numeric;

  // Même règle que pour les comptes : un code inconnu est refusé, pas replié.
  const method = raw !== ''
    ? await getPaymentMethodByCode(db, raw)
    : await getPaymentMethodByCode(db, fallbackCode);
  if (!method) {
    throw new AppError(`Mode de règlement « ${raw || fallbackCode} » introuvable.`, 400);
  }
  return method;
}
