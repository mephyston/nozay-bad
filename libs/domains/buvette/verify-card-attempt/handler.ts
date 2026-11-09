import { AppError, type Db } from '@nba/db';
import { newForeignTxId, type SumUpLookup } from '../shared/sumup';
import { assertCardPaymentsEnabled } from '../shared/queries.repository';
import type { BuvetteCardAttempt, BuvetteSale } from '../shared/schema';
import { CardAttemptRepository } from './repository';
import type { AttemptState, NewAttempt } from './dto';

/** Passé ce délai, une tentative que SumUp ne connaît toujours pas n'a pas abouti. */
export const UNKNOWN_ATTEMPT_DELAY_MS = 2 * 60 * 1000;

const repo = new CardAttemptRepository();

function stateOf(attempt: BuvetteCardAttempt, sale: BuvetteSale): AttemptState {
  return {
    foreignTxId: attempt.foreignTxId,
    amountCents: attempt.amountCents,
    attemptStatus: attempt.status,
    anomaly: attempt.anomaly,
    saleId: sale.id,
    saleStatus: sale.status
  };
}

/** Le paiement est acquis : la vente passe payée, en un seul lot avec la carte et ses mouvements. */
async function settle(db: Db, attempt: BuvetteCardAttempt, sale: BuvetteSale, transactionCode: string | undefined) {
  // La carte d'abord, le statut ensuite : ces écritures exigent que la vente attende encore.
  const statements: any[] = [];
  if (sale.prepaidCardId && sale.prepaidCents > 0) {
    statements.push(
      repo.buildMovementStatement(db, sale, 'debit', sale.prepaidCardId, -sale.prepaidCents),
      repo.buildCaptureStatement(db, sale.id, sale.prepaidCardId, sale.prepaidCents)
    );
  }
  if (sale.rechargeCardId && sale.rechargeCents > 0) {
    statements.push(
      repo.buildMovementStatement(db, sale, 'recharge', sale.rechargeCardId, sale.rechargeCents),
      repo.buildCreditStatement(db, sale.id, sale.rechargeCardId, sale.rechargeCents),
      repo.buildActivatePaperStatement(db, sale.id, sale.rechargeCardId)
    );
  }
  const code = transactionCode ?? null;
  statements.push(
    repo.buildSaleStatusStatement(db, sale.id, 'paid', null),
    repo.buildAttemptStatement(db, attempt.id, { status: 'successful', transactionCode: code })
  );
  try {
    await db.batch(statements as any);
  } catch (error) {
    // Rien n'a été écrit. Seule une vente réglée ou abandonnée entre-temps explique cet échec.
    const raced = await repo.getSale(db, sale.id);
    if (raced?.status === 'in_progress') throw error;
    if (raced?.status === 'paid') await repo.markAttempt(db, attempt.id, { status: 'successful', transactionCode: code });
  }
  // Abandonnée pendant la confirmation : l'argent est pris pour une vente close, à rembourser.
  if ((await repo.getSale(db, sale.id))?.status === 'cancelled') {
    await repo.markAttempt(db, attempt.id, { status: 'successful', anomaly: 'late', transactionCode: code });
  }
}

async function verifyOne(db: Db, lookup: SumUpLookup, attempt: BuvetteCardAttempt, sale: BuvetteSale, now: number): Promise<void> {
  const transaction = await lookup(attempt.foreignTxId);

  if (transaction.status === 'pending') return;
  if (transaction.status === 'unknown') {
    const lapsed = now - attempt.createdAt.getTime() >= UNKNOWN_ATTEMPT_DELAY_MS;
    if (attempt.status === 'pending' && lapsed) await repo.markAttempt(db, attempt.id, { status: 'expired' });
    return;
  }
  if (transaction.status === 'failed') {
    await repo.markAttempt(db, attempt.id, { status: 'failed' });
    return;
  }

  const code = transaction.transactionCode ?? null;
  if (transaction.amountCents !== attempt.amountCents || transaction.currency !== 'EUR') {
    await repo.markAttempt(db, attempt.id, { status: 'successful', anomaly: 'amount', transactionCode: code });
    return;
  }
  // De l'argent a été pris pour une vente qui n'attendait plus : à rembourser, jamais à rattacher.
  if (sale.status !== 'in_progress') {
    // Sauf si c'est ce paiement qui vient de la régler : la caisse et la page de retour vérifient
    // souvent en même temps, et l'autre vérification a pu passer entre nos deux lectures.
    if ((await repo.findByForeignId(db, attempt.foreignTxId))?.status === 'successful') return;
    await repo.markAttempt(db, attempt.id, { status: 'successful', anomaly: 'late', transactionCode: code });
    return;
  }
  await settle(db, attempt, sale, transaction.transactionCode);
}

/** Relit une tentative auprès de SumUp. Sans effet sur une tentative déjà tranchée. */
export async function verifyAttempt(db: Db, lookup: SumUpLookup, foreignTxId: string, now = Date.now()): Promise<AttemptState> {
  const attempt = await repo.findByForeignId(db, foreignTxId);
  if (!attempt) throw new AppError('Tentative introuvable.', 404);
  const sale = await repo.getSale(db, attempt.saleId);
  if (!sale) throw new AppError('Vente introuvable.', 404);
  if (attempt.status === 'pending' || attempt.status === 'expired') await verifyOne(db, lookup, attempt, sale, now);
  const [after, saleAfter] = await Promise.all([repo.findByForeignId(db, foreignTxId), repo.getSale(db, sale.id)]);
  return stateOf(after!, saleAfter!);
}

/** Le filet du cron : quelques tentatives restées sans réponse depuis plus d'une minute. */
export async function verifyPendingAttempts(db: Db, lookup: SumUpLookup, now = Date.now()): Promise<number> {
  const pending = await repo.listPending(db, new Date(now - 60_000), new Date(now - 24 * 3600 * 1000), 20);
  for (const attempt of pending) {
    try {
      await verifyAttempt(db, lookup, attempt.foreignTxId, now);
    } catch (error) {
      console.error(`[buvette] vérification de la tentative ${attempt.id} en échec`, error);
    }
  }
  return pending.length;
}

async function saleInProgress(db: Db, saleId: number): Promise<BuvetteSale> {
  const sale = await repo.getSale(db, saleId);
  if (!sale) throw new AppError('Vente introuvable.', 404);
  if (sale.status !== 'in_progress') throw new AppError("Cette vente n'attend plus de CB.", 409);
  return sale;
}

/** Tranche d'abord les tentatives ouvertes : on ne décide jamais sur un paiement peut-être passé. */
async function settlePendingOf(db: Db, lookup: SumUpLookup, saleId: number, now: number) {
  for (const attempt of (await repo.listForSale(db, saleId)).filter((a) => a.status === 'pending' || a.status === 'expired')) {
    await verifyAttempt(db, lookup, attempt.foreignTxId, now);
  }
  return repo.listForSale(db, saleId);
}

/** Une nouvelle tentative n'existe qu'une fois établi que les précédentes n'ont pas abouti. */
export async function retryAttempt(db: Db, lookup: SumUpLookup, saleId: number, now = Date.now()): Promise<NewAttempt> {
  const sale = await saleInProgress(db, saleId);
  await assertCardPaymentsEnabled(db, 'La CB est suspendue par le bureau : abandonnez la vente et encaissez autrement.');
  const attempts = await settlePendingOf(db, lookup, saleId, now);
  if (attempts.some((a) => a.status === 'pending')) {
    throw new AppError('Le paiement précédent est encore à vérifier : patientez un instant.', 409);
  }
  if (attempts.some((a) => a.status === 'successful')) {
    throw new AppError('SumUp signale un paiement pour cette vente : voyez la vente avant de relancer.', 409);
  }
  const attempt = await repo.createAttempt(db, sale.id, newForeignTxId(), sale.cardCents);
  return { foreignTxId: attempt.foreignTxId, amountCents: attempt.amountCents };
}

/**
 * Abandonne la vente et libère la réservation. Toujours possible : une panne de SumUp ne doit
 * ni coincer une vente ni empêcher la clôture. La tentative reste relue ensuite (cron) : un
 * paiement qui apparaîtrait après coup est signalé à rembourser, jamais perdu.
 */
export async function abandonSale(db: Db, lookup: SumUpLookup, saleId: number, by: string, now = Date.now()) {
  await saleInProgress(db, saleId);
  try {
    await settlePendingOf(db, lookup, saleId, now);
  } catch (error) {
    console.error(`[buvette] SumUp injoignable à l'abandon de la vente ${saleId}`, error);
  }
  // La vérification vient peut-être de la régler : on relit avant de libérer quoi que ce soit.
  const sale = await repo.getSale(db, saleId);
  if (sale?.status !== 'in_progress') return sale;
  const statements: any[] = [repo.buildSaleStatusStatement(db, saleId, 'cancelled', by)];
  // La libération d'abord : elle exige que la vente attende encore, et ne décompte donc qu'une fois.
  statements.reverse();
  if (sale.prepaidCardId && sale.prepaidCents > 0) statements.unshift(repo.buildReleaseStatement(db, saleId, sale.prepaidCardId, sale.prepaidCents));
  if (sale.orderId) statements.push(repo.buildReopenOrderStatement(db, sale.orderId));
  await db.batch(statements as any);
  return repo.getSale(db, saleId);
}
