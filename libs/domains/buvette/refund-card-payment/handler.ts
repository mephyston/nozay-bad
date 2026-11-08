import { AppError, type Db } from '@nba/db';
import type { SumUpRefunds } from '../shared/sumup-refunds';
import { SumUpRefundsRepository } from '../shared/sumup-refunds.repository';
import { sendClaimedRefund } from '../shared/sumup-refund-runner';
import type { CardPaymentRefundOutput } from './dto';

import { REFUND_SETTLE_MS } from '../shared/sumup-refund-runner';

export { REFUND_SETTLE_MS };
/**
 * Le cron ne déclare l'échec qu'au-delà : SumUp peut mettre du temps à montrer un remboursement
 * passé, et un échec déclaré trop tôt inviterait un bénévole à relancer, donc à rembourser deux fois.
 */
export const REFUND_GIVE_UP_MS = 30 * 60_000;

const repo = new SumUpRefundsRepository();

/**
 * Rembourse par l'API SumUp une CB qui ne doit pas rester encaissée : la part CB d'une vente
 * remboursée, un paiement arrivé sur une vente qui ne l'attendait plus, ou la relance d'une part
 * de remboursement de carte que SumUp n'a pas passée.
 *
 * SumUp n'a pas de clé d'idempotence. Une seule demande part donc par paiement : la ligne est
 * réservée avant l'appel, et ce qui a déjà été remboursé sur la transaction est relu avant tout
 * envoi. Un doute ne renvoie jamais : il attend.
 */
export async function refundCardPayment(
  db: Db,
  sumup: SumUpRefunds,
  input: { attemptId: number; requestedByEmail: string },
  now = new Date()
): Promise<CardPaymentRefundOutput> {
  const attempt = await repo.getAttempt(db, input.attemptId);
  if (!attempt) throw new AppError('Paiement introuvable.', 404);
  const existing = await repo.getRefund(db, attempt.id);
  const owed = attempt.status === 'successful'
    && (attempt.anomaly !== null || attempt.saleStatus === 'cancelled' || existing?.reason === 'card_balance');
  if (!owed) throw new AppError("Ce paiement CB n'est pas à rembourser.", 409);

  const requestedCents = existing?.requestedCents ?? null;
  const result = (status: CardPaymentRefundOutput['status'], amountCents: number, error: string | null = null) => ({
    attemptId: attempt.id, status, amountCents, transactionCode: attempt.transactionCode, error
  });

  if (existing?.status === 'done') return result('done', existing.amountCents ?? 0);
  if (existing?.status === 'pending') {
    // Déjà envoyée : on relit seulement, jamais de second envoi.
    if (now.getTime() - existing.requestedAt.getTime() >= REFUND_SETTLE_MS) {
      const payment = await sumup.find(attempt.foreignTxId);
      const target = requestedCents ?? payment?.amountCents ?? Infinity;
      if (payment && payment.refundedCents >= target) {
        await repo.markDone(db, attempt.id, payment.refundedCents, now);
        return result('done', payment.refundedCents);
      }
    }
    return result('pending', requestedCents ?? attempt.amountCents);
  }

  const claimed = existing
    ? await repo.reclaim(db, attempt.id, input.requestedByEmail, now)
    : await repo.claim(db, { attemptId: attempt.id, reason: 'payment', requestedCents: null, requestedByEmail: input.requestedByEmail, requestedAt: now });
  if (!claimed) return result('pending', requestedCents ?? attempt.amountCents);

  const run = await sendClaimedRefund(db, sumup, repo, {
    attemptId: attempt.id, foreignTxId: attempt.foreignTxId, requestedCents, fresh: !existing, now
  });
  return result(run.status, run.amountCents, run.error);
}

/**
 * Le filet du cron : une demande restée sans réponse est relue, jamais renvoyée. Rien de
 * remboursé chez SumUp au bout de 30 minutes : elle passe en échec, et un bénévole décide.
 */
export async function settlePendingRefunds(db: Db, sumup: SumUpRefunds, now = new Date()): Promise<void> {
  for (const { attemptId } of await repo.pendingBefore(db, new Date(now.getTime() - REFUND_SETTLE_MS))) {
    try {
      const [attempt, refund] = await Promise.all([repo.getAttempt(db, attemptId), repo.getRefund(db, attemptId)]);
      if (!attempt || !refund) continue;
      const payment = await sumup.find(attempt.foreignTxId);
      const target = refund.requestedCents ?? payment?.amountCents ?? Infinity;
      if (payment && payment.refundedCents >= target) await repo.markDone(db, attemptId, refund.requestedCents ?? payment.refundedCents, now);
      else if (now.getTime() - refund.requestedAt.getTime() >= REFUND_GIVE_UP_MS) {
        await repo.markFailed(db, attemptId, "SumUp n'a pas confirmé le remboursement : vérifiez dans l'application SumUp avant de le relancer.");
      }
    } catch (error) {
      console.error('[buvette] relecture d\'un remboursement CB en échec', error);
    }
  }
}
