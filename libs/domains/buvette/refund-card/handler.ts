import { AppError, type Db } from '@nba/db';
import { verifyCardToken } from '../shared/card-tokens';
import { getActiveDevice, getCard, getExpectedCashCents, getOpenSession } from '../shared/queries.repository';
import { RefundCardRepository } from './repository';
import type { RefundCardInput, RefundCardOutput } from './dto';

/**
 * Rend tout le solde en espèces, client présent. La carte reste ouverte, à zéro.
 * L'identifiant de l'acte, unique en base, empêche de rembourser deux fois.
 */
export async function refundCard(db: Db, secret: string, input: RefundCardInput): Promise<RefundCardOutput> {
  const repo = new RefundCardRepository();
  const clientId = `refund-${input.clientId}`;

  const payload = await verifyCardToken(secret, 'scan', input.scanToken);
  if (!payload) throw new AppError('Scan expiré : scannez de nouveau le QR code du client.', 400);
  const card = await getCard(db, payload.c);
  if (!card) throw new AppError('Carte introuvable.', 404);

  const replayed = await repo.findMovement(db, clientId);
  if (replayed) return { amountCents: -replayed.amountCents, email: card.email, replayed: true };

  if (!(await getActiveDevice(db, card.id, payload.d))) throw new AppError('Cet appareil a été déconnecté de la carte.', 400);
  const session = await getOpenSession(db);
  if (!session) throw new AppError('Aucune session de caisse ouverte.', 409);
  if (card.reservedCents > 0) throw new AppError('Une vente est en cours sur cette carte : terminez-la avant de rembourser.', 409);
  if (card.balanceCents <= 0) throw new AppError("Il n'y a rien à rembourser sur cette carte.", 400);

  const expected = await getExpectedCashCents(db, session.id, session.openingFloatCents);
  if (expected < card.balanceCents) throw new AppError("Il n'y a pas assez d'espèces dans la caisse pour ce remboursement.", 409);

  try {
    await db.batch([
      repo.buildDebitStatement(db, card.id, card.balanceCents),
      repo.buildMovementStatement(db, session.id, {
        clientId,
        cardId: card.id,
        type: 'refund',
        amountCents: -card.balanceCents,
        createdByEmail: input.createdByEmail,
        createdAt: new Date()
      })
    ] as any);
  } catch (error) {
    const replay = await repo.findMovement(db, clientId);
    if (replay) return { amountCents: -replay.amountCents, email: card.email, replayed: true };
    if (/CHECK/i.test(String(error))) throw new AppError('Le solde de la carte vient de changer : scannez-la de nouveau.', 409);
    if (/NOT NULL/i.test(String(error))) throw new AppError("La session de caisse vient d'être clôturée.", 409);
    throw error;
  }
  return { amountCents: card.balanceCents, email: card.email, replayed: false };
}
