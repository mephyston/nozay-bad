import { eq, inArray, or } from 'drizzle-orm';
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

export async function getMembersBySeason(db: DbOrTx, seasonId: string | number): Promise<MemberSummary[]> {
  const numericId = Number(seasonId);
  const condition = !isNaN(numericId)
    ? or(eq(membersTable.seasonId, numericId), eq(membersTable.seasonId, seasonId as any))
    : eq(membersTable.seasonId, seasonId as any);
  const result = await db.select().from(membersTable).where(condition).all();
  return result as MemberSummary[];
}

export async function getAllMembers(db: DbOrTx): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).all();
  return result as MemberSummary[];
}

export async function isSeasonClosed(db: DbOrTx, seasonId: string | number): Promise<boolean> {
  const numericId = Number(seasonId);
  const condition = !isNaN(numericId)
    ? or(eq(seasonsTable.id, numericId), eq(seasonsTable.code, String(seasonId)))
    : eq(seasonsTable.code, String(seasonId));

  const season = await db
    .select({ closedAt: seasonsTable.closedAt })
    .from(seasonsTable)
    .where(condition)
    .get();
  return Boolean(season?.closedAt);
}

