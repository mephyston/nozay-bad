import { AppError, type Db } from '@nba/db';
import type { SumUpRefunds } from '../shared/sumup-refunds';
import { RefundCardPaymentRepository } from './repository';
import type { CardPaymentRefundOutput } from './dto';

/** Une demande sans réponse depuis ce délai n'est plus « en cours » : on relit SumUp. */
export const REFUND_SETTLE_MS = 2 * 60_000;
/**
 * Le cron ne déclare l'échec qu'au-delà : SumUp peut mettre du temps à montrer un remboursement
 * passé, et un échec déclaré trop tôt inviterait un bénévole à relancer, donc à rembourser deux fois.
 */
export const REFUND_GIVE_UP_MS = 30 * 60_000;

const repo = new RefundCardPaymentRepository();

/**
 * Rembourse par l'API SumUp une CB qui ne doit pas rester encaissée : la part CB d'une vente
 * remboursée, ou un paiement arrivé sur une vente qui ne l'attendait plus.
 *
 * SumUp n'a pas de clé d'idempotence. Une seule demande part donc par paiement : la ligne est
 * réservée avant l'appel, et ce qui a déjà été remboursé sur la transaction — par l'API ou dans
 * l'application — est relu avant tout envoi. Un doute ne renvoie jamais : il attend.
 */
export async function refundCardPayment(
  db: Db,
  sumup: SumUpRefunds,
  input: { attemptId: number; requestedByEmail: string },
  now = new Date()
): Promise<CardPaymentRefundOutput> {
  const attempt = await repo.getAttempt(db, input.attemptId);
  if (!attempt) throw new AppError('Paiement introuvable.', 404);
  const owed = attempt.status === 'successful' && (attempt.anomaly !== null || attempt.saleStatus === 'cancelled');
  if (!owed) throw new AppError("Ce paiement CB n'est pas à rembourser.", 409);

  const result = (status: CardPaymentRefundOutput['status'], amountCents: number, error: string | null = null) => ({
    attemptId: attempt.id, status, amountCents, transactionCode: attempt.transactionCode, error
  });

  const existing = await repo.getRefund(db, attempt.id);
  if (existing?.status === 'done') return result('done', existing.amountCents ?? 0);
  if (existing?.status === 'pending' && now.getTime() - existing.requestedAt.getTime() < REFUND_SETTLE_MS) {
    return result('pending', attempt.amountCents);
  }

  const payment = await sumup.find(attempt.foreignTxId);
  if (!payment) throw new AppError('SumUp ne retrouve pas ce paiement.', 502);
  const remaining = payment.amountCents - payment.refundedCents;
  if (remaining <= 0) {
    // Déjà remboursé, dans l'application ou par une demande dont la réponse s'est perdue.
    if (!existing && !(await repo.claim(db, attempt.id, input.requestedByEmail, now))) return result('pending', attempt.amountCents);
    await repo.markDone(db, attempt.id, payment.refundedCents, now);
    return result('done', payment.refundedCents);
  }

  const claimed = existing
    ? await repo.reclaim(db, attempt.id, input.requestedByEmail, now)
    : await repo.claim(db, attempt.id, input.requestedByEmail, now);
  if (!claimed) return result('pending', remaining);

  const sent = await sumup.refund(payment.id, remaining);
  if (sent.outcome === 'done') {
    await repo.markDone(db, attempt.id, remaining, now);
    return result('done', remaining);
  }
  if (sent.outcome === 'refused') {
    await repo.markFailed(db, attempt.id, sent.message);
    return result('failed', remaining, sent.message);
  }
  return result('pending', remaining);
}

/**
 * Le filet du cron : une demande restée sans réponse est relue, jamais renvoyée. Rien de
 * remboursé chez SumUp : elle passe en échec, et un bénévole décide de relancer.
 */
export async function settlePendingRefunds(db: Db, sumup: SumUpRefunds, now = new Date()): Promise<void> {
  for (const { attemptId } of await repo.pendingBefore(db, new Date(now.getTime() - REFUND_SETTLE_MS))) {
    try {
      const attempt = await repo.getAttempt(db, attemptId);
      const payment = attempt ? await sumup.find(attempt.foreignTxId) : null;
      const refund = await repo.getRefund(db, attemptId);
      if (payment && payment.refundedCents >= payment.amountCents) await repo.markDone(db, attemptId, payment.refundedCents, now);
      else if (refund && now.getTime() - refund.requestedAt.getTime() >= REFUND_GIVE_UP_MS) {
        await repo.markFailed(db, attemptId, "SumUp n'a pas confirmé le remboursement : vérifiez dans l'application SumUp avant de le relancer.");
      }
    } catch (error) {
      console.error('[buvette] relecture d\'un remboursement CB en échec', error);
    }
  }
}
