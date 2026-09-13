import { AppError, type Db } from '@nba/db';
import { and, eq, ne } from 'drizzle-orm';
import { accountClassesTable, accountsTable, type AccountKind } from '../../shared/schema';

export interface CreateAccountInput {
  code: string;
  label: string;
  accountClassCode: string;
  kind: AccountKind;
  statementAccountNumber?: string | null;
}

export interface UpdateAccountInput {
  label?: string;
  accountClassCode?: string;
  kind?: AccountKind;
  active?: boolean;
  statementAccountNumber?: string | null;
}

/** Le numéro de relevé, épuré ; vide devient null, un doublon est refusé : l'import ne saurait plus choisir. */
async function statementNumber(db: Db, raw: string | null | undefined, exceptId: number | null): Promise<string | null> {
  const value = (raw ?? '').replace(/\s+/g, '');
  if (value === '') return null;
  const taken = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.statementAccountNumber, value)).get();
  if (taken && taken.id !== exceptId) throw new AppError(`Le numéro de relevé « ${value} » est déjà porté par un autre compte.`, 409);
  return value;
}

/**
 * Un compte de trésorerie se rattache à une classe de trésorerie (512, 517, 530…), jamais
 * à une classe de charge ou de produit : c'est ce qui le range au bilan de trésorerie.
 */
async function treasuryClassId(db: Db, code: string): Promise<number> {
  const cls = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, code)).get();
  if (!cls) throw new AppError(`Classe de compte « ${code} » inconnue.`, 400);
  if (cls.type !== 'tresorerie') throw new AppError(`La classe ${cls.code} n'est pas une classe de trésorerie.`, 400);
  return cls.id;
}

export async function createAccount(db: Db, input: CreateAccountInput, now: Date = new Date()) {
  const existing = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.code, input.code)).get();
  if (existing) throw new AppError(`Un compte porte déjà le code « ${input.code} ».`, 409);
  const accountClassId = await treasuryClassId(db, input.accountClassCode);
  const statementAccountNumber = await statementNumber(db, input.statementAccountNumber, null);
  return db
    .insert(accountsTable)
    .values({ code: input.code, label: input.label.trim(), accountClassId, kind: input.kind, active: true, statementAccountNumber, createdAt: now })
    .returning()
    .get();
}

export async function updateAccount(db: Db, id: number, input: UpdateAccountInput) {
  const current = await db.select().from(accountsTable).where(eq(accountsTable.id, id)).get();
  if (!current) throw new AppError('Compte introuvable.', 404);
  // Le compte d'attente des adhérents n'est pas un compte de trésorerie : ni nature ni
  // désactivation depuis cet écran, il vit avec le rapprochement.
  if (current.kind === 'third_party' && (input.kind !== undefined || input.active === false)) {
    throw new AppError("Le compte d'attente des adhérents ne se modifie pas ici.", 400);
  }

  const values: Partial<typeof accountsTable.$inferInsert> = {};
  if (input.label !== undefined) values.label = input.label.trim();
  if (input.kind !== undefined) values.kind = input.kind;
  if (input.active !== undefined) values.active = input.active;
  if (input.accountClassCode !== undefined) values.accountClassId = await treasuryClassId(db, input.accountClassCode);
  if (input.statementAccountNumber !== undefined) values.statementAccountNumber = await statementNumber(db, input.statementAccountNumber, id);

  /*
   * Le dernier compte bancaire actif ne s'éteint pas : sans lui, plus de rapprochement,
   * plus de remise de chèques, plus de clôture — l'application ne dit plus rien de la
   * trésorerie. Le club en crée un autre d'abord.
   */
  if (input.active === false && current.kind === 'bank') {
    const otherBank = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(and(eq(accountsTable.kind, 'bank'), eq(accountsTable.active, true), ne(accountsTable.id, id)))
      .get();
    if (!otherBank) throw new AppError('Impossible de désactiver le dernier compte bancaire actif.', 400);
  }

  return db.update(accountsTable).set(values).where(eq(accountsTable.id, id)).returning().get();
}
