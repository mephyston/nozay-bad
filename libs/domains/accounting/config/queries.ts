import type { AccountKind, PaymentMethodKind } from '../shared/schema';
import { type DbOrTx, AppError } from '@nba/db';
import { and, eq } from 'drizzle-orm';
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
  kind: AccountKind;
  active: boolean;
  statementAccountNumber: string | null;
}

/** Tous les comptes du club, avec la classe qui les porte, dans l'ordre du seed. */
export async function listAccounts(db: DbOrTx): Promise<AccountSummary[]> {
  const rows = await db
    .select({
      id: accountsTable.id,
      code: accountsTable.code,
      label: accountsTable.label,
      classCode: accountClassesTable.code,
      classType: accountClassesTable.type,
      kind: accountsTable.kind,
      active: accountsTable.active,
      statementAccountNumber: accountsTable.statementAccountNumber
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

/** Le premier compte actif d'une nature : le compte bancaire principal est le premier `bank`. */
export async function getAccountByKind(db: DbOrTx, kind: AccountKind): Promise<typeof accountsTable.$inferSelect | undefined> {
  return db.select().from(accountsTable)
    .where(and(eq(accountsTable.kind, kind), eq(accountsTable.active, true)))
    .orderBy(accountsTable.id)
    .get();
}

/** Le premier moyen de paiement actif d'une nature. */
export async function getPaymentMethodByKind(db: DbOrTx, kind: PaymentMethodKind): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
  return db.select().from(paymentMethodsTable)
    .where(and(eq(paymentMethodsTable.kind, kind), eq(paymentMethodsTable.active, true)))
    .orderBy(paymentMethodsTable.id)
    .get();
}

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  bank: 'compte bancaire',
  cash: 'caisse',
  wallet: 'porte-monnaie',
  third_party: "compte d'attente"
};

export interface ResolveOptions {
  /** Une valeur absente se replie sur le premier compte actif de cette nature. */
  fallbackKind?: AccountKind;
  /** Vrai pour une écriture nouvelle : un compte rendu inactif ne reçoit plus rien. */
  active?: boolean;
}

/**
 * L'identifiant d'un compte, qu'on lui passe son code ou son identifiant.
 *
 * Remplace les tables `{ current: 1, savings: 2, cash: 3 }` recopiées dans cinq fichiers :
 * elles ne valaient que pour l'ordre du seed d'origine et retombaient silencieusement sur le
 * compte courant devant un code inconnu. Le repli, lui, ne connaît plus de code : c'est le
 * compte bancaire principal du club — le premier compte `bank` actif — quel que soit son code.
 */
export async function resolveAccountId(db: DbOrTx, value: unknown, options: ResolveOptions = {}): Promise<number> {
  const { fallbackKind = 'bank', active = false } = options;
  const check = (account: typeof accountsTable.$inferSelect | undefined, asked: string) => {
    if (!account) throw new AppError(`Compte de trésorerie « ${asked} » introuvable.`, 400);
    if (active && account.active === false) throw new AppError(`Le compte « ${account.label} » est inactif : il ne reçoit plus d'écriture.`, 400);
    return account.id;
  };

  if (typeof value === 'number' && Number.isFinite(value)) {
    return active ? check(await getAccountById(db, value), String(value)) : value;
  }
  const raw = String(value ?? '').trim();
  if (raw !== '' && !isNaN(Number(raw))) {
    return active ? check(await getAccountById(db, Number(raw)), raw) : Number(raw);
  }

  /*
   * Un code fourni et inconnu est refusé, jamais replié sur le compte par défaut. C'est tout
   * l'intérêt de résoudre en base : les correspondances codées en dur retombaient sur le compte
   * courant, si bien qu'une faute de frappe déplaçait l'argent d'un compte à l'autre en silence.
   * Le repli ne sert qu'à l'absence de valeur.
   */
  if (raw !== '') return check(await getAccountByCode(db, raw), raw);
  const fallback = await getAccountByKind(db, fallbackKind);
  if (!fallback) throw new AppError(`Aucun ${ACCOUNT_KIND_LABELS[fallbackKind]} actif : réglez les comptes du club avant de saisir.`, 400);
  return fallback.id;
}

export async function getAccountById(db: DbOrTx, id: number): Promise<typeof accountsTable.$inferSelect | undefined> {
  return db.select().from(accountsTable).where(eq(accountsTable.id, id)).get();
}

/**
 * La méthode de règlement, qu'on lui passe son code ou son identifiant.
 *
 * La table codée en dur qu'elle remplace était **décalée d'un cran** à partir de `labaz` :
 * le seed intercale `cb` en quatrième position, que la table ignorait. Saisir un chèque LABAZ
 * enregistrait donc une carte bancaire, un ANCV un chèque LABAZ, et ainsi de suite jusqu'au
 * bout de la liste — sans la moindre erreur, et en faisant perdre au passage le
 * `default_entry_status` de la vraie méthode.
 *
 * `active` : une écriture nouvelle refuse un moyen rendu inactif ; la relecture d'une ancienne
 * le retrouve toujours.
 */
export async function resolvePaymentMethod(
  db: DbOrTx,
  value: unknown,
  options: { fallbackKind?: PaymentMethodKind; active?: boolean } = {}
): Promise<typeof paymentMethodsTable.$inferSelect> {
  const { fallbackKind = 'transfer', active = false } = options;
  const check = (method: typeof paymentMethodsTable.$inferSelect | undefined, asked: string) => {
    if (!method) throw new AppError(`Mode de règlement « ${asked} » introuvable.`, 400);
    if (active && method.active === false) throw new AppError(`Le moyen de paiement « ${method.label} » est inactif.`, 400);
    return method;
  };

  if (typeof value === 'number' && Number.isFinite(value)) {
    const byId = await getPaymentMethodById(db, value);
    if (byId) return check(byId, String(value));
  }
  const raw = String(value ?? '').trim();
  if (raw !== '' && !isNaN(Number(raw))) {
    const numeric = await getPaymentMethodById(db, Number(raw));
    if (numeric) return check(numeric, raw);
  }

  // Même règle que pour les comptes : un code inconnu est refusé, pas replié.
  if (raw !== '') return check(await getPaymentMethodByCode(db, raw), raw);
  const fallback = await getPaymentMethodByKind(db, fallbackKind);
  if (!fallback) throw new AppError(`Aucun moyen de paiement actif de nature « ${fallbackKind} ».`, 400);
  return fallback;
}
