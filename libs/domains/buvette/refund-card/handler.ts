import { AppError, type Db } from '@nba/db';
import { verifyCardToken } from '../shared/card-tokens';
import { assertScannedCardUsable, getCard, getExpectedCashCents, getOpenSession } from '../shared/queries.repository';
import { planCardRefund } from '../shared/card-refund-plan';
import type { SumUpRefunds } from '../shared/sumup-refunds';
import { SumUpRefundsRepository } from '../shared/sumup-refunds.repository';
import { REFUND_SETTLE_MS, sendClaimedRefund } from '../shared/sumup-refund-runner';
import { isClosedSessionError } from '../shared/validation';
import { RefundCardRepository } from './repository';
import type { CardRefundLine, RefundCardInput, RefundCardOutput } from './dto';

const repo = new RefundCardRepository();
const refunds = new SumUpRefundsRepository();

interface Part {
  attemptId: number;
  foreignTxId: string;
  transactionCode: string | null;
  amountCents: number;
  status: 'pending' | 'done' | 'failed' | 'cash';
  requestedAt: Date | null;
}

async function replayOf(db: Db, clientId: string, email: string | null): Promise<RefundCardOutput | null> {
  const movements = await repo.findMovements(db, clientId);
  if (movements.length === 0) return null;
  const cash = movements.find((m) => m.sumupAttemptId === null);
  const cardRefunds: CardRefundLine[] = [];
  for (const m of movements.filter((m) => m.sumupAttemptId !== null)) {
    const [attempt, refund] = await Promise.all([refunds.getAttempt(db, m.sumupAttemptId!), refunds.getRefund(db, m.sumupAttemptId!)]);
    cardRefunds.push({ attemptId: m.sumupAttemptId!, amountCents: -m.amountCents, transactionCode: attempt?.transactionCode ?? null, status: refund?.status === 'done' ? 'done' : 'pending' });
  }
  const cashCents = cash ? -cash.amountCents : 0;
  return { amountCents: cashCents + cardRefunds.reduce((s, r) => s + r.amountCents, 0), cashCents, cardRefunds, cashFallbacks: [], email, replayed: true };
}

/** Un remboursement interrompu entre la réservation et la fin : ses parts sont réservées, aucun mouvement. */
async function unfinishedOf(db: Db, cardId: number): Promise<string | null> {
  for (const id of await refunds.refundClientIdsOf(db, cardId)) {
    if ((await repo.findMovements(db, id)).length === 0) return id;
  }
  return null;
}

function explain(error: unknown): never {
  if (isClosedSessionError(error)) throw new AppError("La session de caisse est clôturée : ouvrez-en une et recommencez, le remboursement reprendra où il s'est arrêté.", 409);
  if (/UNIQUE/i.test(String(error))) throw new AppError('Un remboursement est déjà en cours sur cette carte.', 409);
  if (/CHECK/i.test(String(error))) throw new AppError('Le solde de la carte vient de changer : scannez-la de nouveau.', 409);
  throw error;
}

/**
 * Rend tout le solde, client présent. La carte reste ouverte, à zéro.
 *
 * Ce que des recharges par CB ont apporté revient d'abord sur ces CB, par l'API SumUp : la
 * caisse garde ses espèces. Trois temps : le solde et les parts CB sont réservés ensemble,
 * SumUp rembourse, puis le solde est retiré avec un mouvement par part. Une part refusée est
 * rendue en espèces et close. Interrompu entre deux temps, le remboursement reprend au scan
 * suivant de la carte, sans rien renvoyer qui soit peut-être déjà parti. Sans SumUp, tout sort
 * en espèces. L'identifiant de l'acte empêche de rembourser deux fois.
 */
export async function refundCard(db: Db, secret: string, input: RefundCardInput, sumup?: SumUpRefunds): Promise<RefundCardOutput> {
  const payload = await verifyCardToken(secret, 'scan', input.scanToken);
  if (!payload) throw new AppError('Scan expiré : scannez de nouveau le QR code du client.', 400);
  const card = await getCard(db, payload.c);
  if (!card) throw new AppError('Carte introuvable.', 404);

  const resumed = await unfinishedOf(db, card.id);
  const clientId = resumed ?? `refund-${input.clientId}`;
  if (!resumed) {
    const replayed = await replayOf(db, clientId, card.email);
    if (replayed) return replayed;
  }

  await assertScannedCardUsable(db, card.id, payload.d);
  const session = await getOpenSession(db);
  if (!session) throw new AppError('Aucune session de caisse ouverte.', 409);
  const now = new Date();

  let balance: number;
  let parts: Part[];
  if (resumed) {
    // La réservation posée au premier temps vaut tout le solde d'alors.
    balance = card.reservedCents;
    parts = (await refunds.partsOf(db, resumed)).map((p) => ({ ...p, amountCents: p.requestedCents ?? 0 }));
  } else {
    if (card.reservedCents > 0) throw new AppError('Une vente est en cours sur cette carte : terminez-la avant de rembourser.', 409);
    balance = card.balanceCents;
    if (balance <= 0) throw new AppError("Il n'y a rien à rembourser sur cette carte.", 400);
    const plan = sumup ? planCardRefund(balance, await refunds.cardRechargePayments(db, card.id)) : [];
    const expected = await getExpectedCashCents(db, session.id, session.openingFloatCents);
    if (expected < balance - plan.reduce((sum, p) => sum + p.amountCents, 0)) throw new AppError("Il n'y a pas assez d'espèces dans la caisse pour ce remboursement.", 409);
    if (plan.length) {
      try {
        await db.batch([
          repo.buildReserveStatement(db, card.id, balance),
          ...plan.map((p) => refunds.buildClaimStatement(db, {
            attemptId: p.attemptId, reason: 'card_balance', requestedCents: p.amountCents, refundClientId: clientId, requestedByEmail: input.createdByEmail, requestedAt: now
          }))
        ] as any);
      } catch (error) {
        explain(error);
      }
    }
    parts = plan.map((p) => ({ ...p, status: 'pending', requestedAt: null }));
  }

  // SumUp rembourse. Un refus se rend en espèces ; un doute reste sur la CB, relu par le cron.
  const sent: (Part & { status: 'done' | 'pending' })[] = [];
  const cashFallbacks: RefundCardOutput['cashFallbacks'] = [];
  for (const part of parts) {
    if (part.status === 'done') { sent.push({ ...part, status: 'done' }); continue; }
    if (part.status === 'pending' && part.requestedAt && now.getTime() - part.requestedAt.getTime() < REFUND_SETTLE_MS) {
      throw new AppError('SumUp traite encore ce remboursement : réessayez dans une minute.', 409);
    }
    const run = part.status === 'pending' && sumup
      ? await sendClaimedRefund(db, sumup, refunds, { attemptId: part.attemptId, foreignTxId: part.foreignTxId, requestedCents: part.amountCents, fresh: !part.requestedAt, now })
      : { status: 'failed' as const, amountCents: part.amountCents, error: 'SumUp indisponible.' };
    if (run.status === 'failed') {
      await refunds.markCash(db, part.attemptId, run.error);
      cashFallbacks.push({ amountCents: part.amountCents, reason: run.error ?? 'SumUp a refusé.' });
    } else sent.push({ ...part, status: run.status });
  }
  const cashCents = balance - sent.reduce((sum, p) => sum + p.amountCents, 0);

  // Le solde retiré, avec un mouvement par part : la clôture range chacune sur son compte.
  const movement = (suffix: string, amountCents: number, sumupAttemptId: number | null) =>
    repo.buildMovementStatement(db, session.id, {
      clientId: `${clientId}${suffix}`, cardId: card.id, type: 'refund', amountCents: -amountCents, sumupAttemptId, createdByEmail: input.createdByEmail, createdAt: now
    });
  try {
    await db.batch([
      parts.length ? repo.buildDebitReservedStatement(db, card.id, balance) : repo.buildDebitStatement(db, card.id, balance),
      // Fermée dans le même lot : une carte papier remboursée ne vaut plus rien, même présentée à nouveau.
      ...(card.kind === 'paper' ? [repo.buildClosePaperStatement(db, card.id)] : []),
      ...sent.map((p) => movement(`-cb-${p.attemptId}`, p.amountCents, p.attemptId)),
      ...(cashCents > 0 ? [movement('', cashCents, null)] : [])
    ] as any);
  } catch (error) {
    const replay = await replayOf(db, clientId, card.email);
    if (replay) return replay;
    explain(error);
  }
  return {
    amountCents: balance,
    cashCents,
    cardRefunds: sent.map((p) => ({ attemptId: p.attemptId, amountCents: p.amountCents, transactionCode: p.transactionCode, status: p.status })),
    cashFallbacks,
    email: card.email,
    replayed: false
  };
}
