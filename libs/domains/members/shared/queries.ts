import { membersTable } from '@nba/members/schema';
import { getActiveSeasonId, getSeasonId, isSeasonClosed } from '@nba/accounting-api';
import { and, eq, inArray, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';


export interface MemberSummary {
  id: number;
  licence: string;
  season: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  amountDue: number;
  amountReceived: number;
  amountRemaining: number;
  paid: boolean;
  expenseAuthorized: boolean;
}

export async function getMemberById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
  const result = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  return result as unknown as MemberSummary | undefined;
}

export async function getMembersByIds(db: DbOrTx, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];
  
  const chunkSize = 90;
  const results: any[] = [];
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkResults = await db.select().from(membersTable).where(inArray(membersTable.id, chunk)).all();
    results.push(...chunkResults);
  }
  
  return results as unknown as MemberSummary[];
}

export async function getMembersBySeason(db: DbOrTx, seasonId: string | number): Promise<MemberSummary[]> {
  const numericId = await getSeasonId(db, seasonId);
  const condition = numericId !== undefined
    ? eq(membersTable.seasonId, numericId)
    : eq(membersTable.seasonId, seasonId as any);
  const result = await db.select().from(membersTable).where(condition).all();
  return result as unknown as MemberSummary[];
}

export async function getAllMembers(db: DbOrTx): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).all();
  return result as unknown as MemberSummary[];
}

/**
 * Emails de contact d'un adhérent : le sien et ceux de ses représentants légaux.
 * Un adhérent mineur n'a pas d'email au dossier — c'est le parent qui détient le
 * compte du storefront, donc l'abonnement aux notifications.
 */
export async function getContactEmailsForMember(db: DbOrTx, memberId: number): Promise<string[]> {
  const row = await db
    .select({
      email: membersTable.email,
      parent1Email: membersTable.parent1Email,
      parent2Email: membersTable.parent2Email
    })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .get();
  if (!row) return [];

  const emails = new Set<string>();
  for (const value of [row.email, row.parent1Email, row.parent2Email]) {
    const normalized = value?.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }
  return [...emails];
}

/**
 * Emails de contact des foyers de la saison active, normalisés en minuscules.
 *
 * Les emails des parents sont inclus : pour un adhérent mineur, l'adresse au
 * dossier est celle du représentant légal, et c'est elle qui porte le compte du
 * storefront. Consommé par le ciblage des notifications push.
 */
export async function getHouseholdEmailsForActiveSeason(
  db: DbOrTx,
  options: { unpaidOnly?: boolean } = {}
): Promise<string[]> {
  const seasonId = await getActiveSeasonId(db);
  if (seasonId === undefined) return [];

  const conditions = [eq(membersTable.seasonId, seasonId)];
  if (options.unpaidOnly) {
    conditions.push(eq(membersTable.paid, false));
  }

  const rows = await db
    .select({
      email: membersTable.email,
      parent1Email: membersTable.parent1Email,
      parent2Email: membersTable.parent2Email
    })
    .from(membersTable)
    .where(and(...conditions))
    .all();

  const emails = new Set<string>();
  for (const row of rows) {
    for (const value of [row.email, row.parent1Email, row.parent2Email]) {
      const normalized = value?.trim().toLowerCase();
      if (normalized) emails.add(normalized);
    }
  }
  return [...emails];
}

export { isSeasonClosed };

