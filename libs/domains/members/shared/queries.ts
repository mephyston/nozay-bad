import { eq, inArray } from 'drizzle-orm';
import { membersTable } from '@metacult/features-members-data-access';

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

export async function getMemberById(db: any, id: number): Promise<MemberSummary | undefined> {
  const result = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  return result as MemberSummary | undefined;
}

export async function getMembersByIds(db: any, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];
  const result = await db.select().from(membersTable).where(inArray(membersTable.id, ids)).all();
  return result as MemberSummary[];
}

export async function getMembersBySeason(db: any, seasonId: string): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).where(eq(membersTable.season, seasonId)).all();
  return result as MemberSummary[];
}

export async function getAllMembers(db: any): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).all();
  return result as MemberSummary[];
}
