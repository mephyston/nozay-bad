import { type Db } from '@nba/db';
import { updateExpenseAuthorization } from './repository';
import { getMemberById } from '../shared/queries';
import { MemberNotFoundError } from '../shared/errors';

export async function setMemberExpenseAuthorization(db: Db, id: number, authorized: boolean): Promise<{ id: number; expenseAuthorized: boolean }> {
  const existing = await getMemberById(db, id);
  if (!existing) {
    throw new MemberNotFoundError();
  }
  await updateExpenseAuthorization(db, id, authorized);
  return { id, expenseAuthorized: authorized };
}
