import { AppError, type Db } from '@nba/db';
import { signCardToken, verifyCardToken } from '../shared/card-tokens';
import { availableCents, getActiveDevice, getCard, getPendingOrderId } from '../shared/queries.repository';
import { maskEmail } from '../shared/mask';
import type { ScanCardOutput } from './dto';

export { maskEmail };

export async function scanCard(db: Db, secret: string, qrToken: string): Promise<ScanCardOutput> {
  const payload = await verifyCardToken(secret, 'qr', qrToken);
  if (!payload) throw new AppError('QR code expiré ou invalide : demandez au client de le rafraîchir.', 400);
  if (!(await getActiveDevice(db, payload.c, payload.d))) throw new AppError('Cet appareil a été déconnecté de la carte.', 400);
  const card = await getCard(db, payload.c);
  if (!card) throw new AppError('Carte introuvable.', 404);
  const { token } = await signCardToken(secret, 'scan', card.id, payload.d);
  return { scanToken: token, label: maskEmail(card.email), balanceCents: availableCents(card), pendingOrderId: await getPendingOrderId(db, card.id) };
}
