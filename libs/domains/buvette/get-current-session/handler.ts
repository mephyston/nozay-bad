import { type Db } from '@nba/db';
import { getExpectedCashCents, getOpenSession } from '../shared/queries.repository';
import { GetCurrentSessionRepository } from './repository';
import type { CurrentSession } from './dto';

export async function getCurrentSession(db: Db): Promise<CurrentSession | null> {
  const session = await getOpenSession(db);
  if (!session) return null;
  const repo = new GetCurrentSessionRepository();
  const totals = await repo.totals(db, session.id);
  return {
    session,
    expectedCashCents: await getExpectedCashCents(db, session.id, session.openingFloatCents),
    prepaidCents: Number(totals?.prepaidCents ?? 0),
    salesCount: Number(totals?.salesCount ?? 0),
    cardCents: Number(totals?.cardCents ?? 0),
    inProgress: await repo.inProgress(db, session.id),
    toRefund: await repo.toRefund(db, session.id)
  };
}
