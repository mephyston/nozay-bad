import type { DbOrTx } from '@nba/db';
import type { SumUpRefunds } from './sumup-refunds';
import type { SumUpRefundsRepository } from './sumup-refunds.repository';

/** Une demande envoyée depuis moins longtemps est peut-être en route : on ne la renvoie pas. */
export const REFUND_SETTLE_MS = 2 * 60_000;

export interface RefundRun {
  status: 'done' | 'pending' | 'failed';
  amountCents: number;
  error: string | null;
}

/**
 * Envoie un remboursement dont la ligne est déjà réservée (`pending`).
 *
 * SumUp n'a pas de clé d'idempotence : avant d'envoyer, on relit ce que la transaction a déjà
 * remboursé. `requestedCents` vide vise tout ce qui reste ; sinon une part précise. `fresh` dit
 * que la ligne vient d'être créée : un remboursement déjà présent sur la transaction n'est alors
 * pas le nôtre, et la part est refusée plutôt que comptée deux fois.
 */
export async function sendClaimedRefund(
  db: DbOrTx,
  sumup: SumUpRefunds,
  repo: SumUpRefundsRepository,
  run: { attemptId: number; foreignTxId: string; requestedCents: number | null; fresh: boolean; now: Date }
): Promise<RefundRun> {
  const fail = async (error: string): Promise<RefundRun> => {
    await repo.markFailed(db, run.attemptId, error);
    return { status: 'failed', amountCents: run.requestedCents ?? 0, error };
  };
  const done = async (amountCents: number): Promise<RefundRun> => {
    await repo.markDone(db, run.attemptId, amountCents, run.now);
    return { status: 'done', amountCents, error: null };
  };

  let payment;
  try {
    payment = await sumup.find(run.foreignTxId);
  } catch {
    return { status: 'pending', amountCents: run.requestedCents ?? 0, error: null };
  }
  if (!payment) return fail('SumUp ne retrouve pas ce paiement.');

  let target: number;
  if (run.requestedCents === null) {
    target = payment.amountCents - payment.refundedCents;
    if (target <= 0) return done(payment.refundedCents);
  } else {
    if (!run.fresh && payment.refundedCents >= run.requestedCents) return done(run.requestedCents);
    if (run.fresh && payment.refundedCents > 0) return fail('Ce paiement a déjà été remboursé en partie dans SumUp.');
    if (payment.amountCents - payment.refundedCents < run.requestedCents) return fail('Le reste de ce paiement ne couvre pas le remboursement.');
    target = run.requestedCents;
  }

  const sent = await sumup.refund(payment.id, target);
  if (sent.outcome === 'done') return done(target);
  if (sent.outcome === 'refused') return fail(sent.message);
  return { status: 'pending', amountCents: target, error: null };
}
