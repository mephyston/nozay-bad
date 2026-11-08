import { type Db } from '@nba/db';
import { getExpectedCashCents, getOpenSession } from '../shared/queries.repository';
import { SumUpRefundsRepository } from '../shared/sumup-refunds.repository';
import { GetCurrentSessionRepository } from './repository';
import type { CurrentSession } from './dto';

export async function getCurrentSession(db: Db): Promise<CurrentSession | null> {
  const session = await getOpenSession(db);
  if (!session) return null;
  const repo = new GetCurrentSessionRepository();
  const totals = await repo.totals(db, session.id);
  // Un solde de carte que SumUp n'a pas pu rendre reste dû au client, quelle que soit la session.
  const failedCardRefunds = await new SumUpRefundsRepository().failedCardBalanceRefunds(db);
  return {
    session,
    expectedCashCents: await getExpectedCashCents(db, session.id, session.openingFloatCents),
    prepaidCents: Number(totals?.prepaidCents ?? 0),
    salesCount: Number(totals?.salesCount ?? 0),
    cardCents: Number(totals?.cardCents ?? 0),
    inProgress: await repo.inProgress(db, session.id),
    toRefund: [
      ...(await repo.toRefund(db, session.id)).map((r) => ({ kind: 'stray' as const, ...r })),
      ...failedCardRefunds.map((r) => ({
        kind: 'card_balance' as const, attemptId: r.attemptId, transactionCode: r.transactionCode, amountCents: r.requestedCents ?? 0, anomaly: null, refundStatus: r.status
      }))
    ]
  };
}
