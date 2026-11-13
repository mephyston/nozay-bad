import { AppError, type Db } from '@nba/db';
import { HANDOVER_QR_PREFIX, RECEIPT_QR_PREFIX, TOKEN_TTL_MS, randomToken, sha256 } from '../../shared/cash';
import { findHandover, findReceipt } from '../../shared/cash-store';
import { RenewCashTokenRepository } from './repository';

export interface RenewedToken { qr: string; qrExpiresAt: string }

/**
 * Un nouveau QR code pour un reçu ou une remise encore en attente : l'ancien ne vaut plus.
 * Le QR code ne vit que 2 minutes ; l'écran en redemande un quand il expire.
 */
export async function renewReceiptToken(db: Db, actorEmail: string, id: number, now = new Date()): Promise<RenewedToken> {
  const found = await findReceipt(db, id);
  if (!found || found.receipt.collectorEmail !== actorEmail.toLowerCase()) throw new AppError('Reçu introuvable.', 404);
  if (found.receipt.status !== 'pending') throw new AppError('Ce reçu n’attend plus de signature.', 409);
  return await renew(db, 'receipt', id, RECEIPT_QR_PREFIX, now);
}

export async function renewHandoverToken(db: Db, id: number, now = new Date()): Promise<RenewedToken> {
  const handover = await findHandover(db, id);
  if (!handover) throw new AppError('Remise introuvable.', 404);
  if (handover.status !== 'pending') throw new AppError('Cette remise n’attend plus de signature.', 409);
  return await renew(db, 'handover', id, HANDOVER_QR_PREFIX, now);
}

async function renew(db: Db, kind: 'receipt' | 'handover', id: number, prefix: string, now: Date): Promise<RenewedToken> {
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  await new RenewCashTokenRepository().setToken(db, kind, id, await sha256(token), expiresAt);
  return { qr: prefix + token, qrExpiresAt: expiresAt.toISOString() };
}
