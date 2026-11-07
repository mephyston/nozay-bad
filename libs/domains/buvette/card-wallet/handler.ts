import { AppError, type Db } from '@nba/db';
import { signCardToken } from '../shared/card-tokens';
import { getActiveDevice, getCard } from '../shared/queries.repository';
import { CardWalletRepository } from './repository';
import type { QrTokenOutput, WalletOutput } from './dto';

/** Un appareil déconnecté n'obtient plus rien : ni solde, ni QR code. */
async function assertDevice(db: Db, cardId: number, deviceId: string) {
  if (!(await getActiveDevice(db, cardId, deviceId))) {
    throw new AppError('Cet appareil a été déconnecté de la carte.', 401);
  }
}

export async function getWallet(db: Db, cardId: number, deviceId: string): Promise<WalletOutput> {
  await assertDevice(db, cardId, deviceId);
  const card = await getCard(db, cardId);
  if (!card) throw new AppError('Carte introuvable.', 404);
  const movements = await new CardWalletRepository().movements(db, cardId);
  return { email: card.email, balanceCents: card.balanceCents, movements };
}

export async function issueQrToken(db: Db, secret: string, cardId: number, deviceId: string): Promise<QrTokenOutput> {
  await assertDevice(db, cardId, deviceId);
  return signCardToken(secret, 'qr', cardId, deviceId);
}

/** Ferme tous les autres appareils. Le solde ne bouge pas. */
export async function revokeOtherDevices(db: Db, cardId: number, deviceId: string): Promise<void> {
  await assertDevice(db, cardId, deviceId);
  await new CardWalletRepository().revokeOthers(db, cardId, deviceId);
}
