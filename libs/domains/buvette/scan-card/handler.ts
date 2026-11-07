import { AppError, type Db } from '@nba/db';
import { findDeviceForCode, readCardCode, signCardToken, verifyCardToken } from '../shared/card-tokens';
import { maskEmail } from '../shared/mask';
import { closedPaperMessage, hashPaperCode, PAPER_DEVICE, paperLabel, readPaperCode } from '../shared/paper-card';
import { availableCents, cardLabel, getActiveDevice, getCard, getPendingOrderId } from '../shared/queries.repository';
import { ScanCardRepository } from './repository';
import type { ScanCardOutput } from './dto';

export { maskEmail };

/** Une carte papier ne porte pas de QR code tournant : son code imprimé la désigne. */
async function scanPaper(db: Db, secret: string, code: string): Promise<ScanCardOutput> {
  const card = await new ScanCardRepository().findByPaperHash(db, await hashPaperCode(code));
  if (!card) throw new AppError('Carte papier introuvable.', 404);
  if (card.paperStatus === 'closed') throw new AppError(closedPaperMessage(card.paperClosedReason), 409);
  const { token } = await signCardToken(secret, 'scan', card.id, PAPER_DEVICE);
  return {
    scanToken: token,
    label: paperLabel(card.id),
    balanceCents: availableCents(card),
    pendingOrderId: null,
    kind: 'paper',
    paperStatus: card.paperStatus,
    faceValueCents: card.faceValueCents
  };
}

/** Le QR code lu à la caméra, ou le code affiché dessous et saisi à la main : même contrôle. */
async function readAccountCard(db: Db, secret: string, value: string, nowMs: number): Promise<{ cardId: number; deviceId: string }> {
  const typed = readCardCode(value);
  if (typed) {
    const devices = await new ScanCardRepository().activeDeviceIds(db, typed.cardId);
    const deviceId = await findDeviceForCode(secret, typed, devices, nowMs);
    if (!deviceId) throw new AppError('Code expiré ou erroné : demandez au client le code affiché sous son QR code.', 400);
    return { cardId: typed.cardId, deviceId };
  }
  const payload = await verifyCardToken(secret, 'qr', value, nowMs);
  if (!payload) throw new AppError('QR code expiré ou invalide : demandez au client de le rafraîchir.', 400);
  if (!(await getActiveDevice(db, payload.c, payload.d))) throw new AppError('Cet appareil a été déconnecté de la carte.', 400);
  return { cardId: payload.c, deviceId: payload.d };
}

export async function scanCard(db: Db, secret: string, qrToken: string, nowMs: number = Date.now()): Promise<ScanCardOutput> {
  const paperCode = readPaperCode(qrToken);
  if (paperCode) return scanPaper(db, secret, paperCode);

  const { cardId, deviceId } = await readAccountCard(db, secret, qrToken, nowMs);
  const card = await getCard(db, cardId);
  if (!card) throw new AppError('Carte introuvable.', 404);
  const { token } = await signCardToken(secret, 'scan', card.id, deviceId);
  return {
    scanToken: token,
    label: cardLabel(card),
    balanceCents: availableCents(card),
    pendingOrderId: await getPendingOrderId(db, card.id),
    kind: 'account',
    paperStatus: null,
    faceValueCents: null
  };
}
