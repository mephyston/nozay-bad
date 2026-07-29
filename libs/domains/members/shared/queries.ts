import { membersTable } from '@nba/members/schema';
import { getSeasonId, isSeasonClosed } from '@nba/accounting-api';
import { eq, inArray, or } from 'drizzle-orm';
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
}

export async function getMemberById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
  const result = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  return result as unknown as MemberSummary | undefined;
}

export async function getMembersByIds(db: DbOrTx, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];
  const result = await db.select().from(membersTable).where(inArray(membersTable.id, ids)).all();
  return result as unknown as MemberSummary[];
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

export { isSeasonClosed };

