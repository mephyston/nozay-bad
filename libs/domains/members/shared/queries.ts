import { eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable, seasonsTable } from './schema';

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
}

export async function getMemberById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
  const result = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  return result as MemberSummary | undefined;
}

export async function getMembersByIds(db: DbOrTx, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];
  const result = await db.select().from(membersTable).where(inArray(membersTable.id, ids)).all();
  return result as MemberSummary[];
}

export async function getMembersBySeason(db: DbOrTx, seasonId: string): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).where(eq(membersTable.season, seasonId)).all();
  return result as MemberSummary[];
}

export async function getAllMembers(db: DbOrTx): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).all();
  return result as MemberSummary[];
}

/**
 * Domain helper: check whether a season is closed.
 * Belongs to the `members` domain — canonical owner of `seasonsTable`.
 */
export async function isSeasonClosed(db: DbOrTx, seasonId: string): Promise<boolean> {
  const season = await db
    .select({ closed: seasonsTable.closed })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, seasonId))
    .get();
  return Boolean(season?.closed);
}
