import { AppError, type Db } from '@nba/db';
import { signCardToken } from '../shared/card-tokens';
import { getActiveDevice, getCard } from '../shared/queries.repository';
import { CardWalletRepository } from './repository';
import type { MovementDetail, QrTokenOutput, WalletOutput } from './dto';

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
  return { email: card.email, balanceCents: card.balanceCents, reservedCents: card.reservedCents, movements };
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

/** Supprime une carte à zéro : l'adresse disparaît, l'appareil est fermé, l'historique reste. */
export async function deleteCard(db: Db, cardId: number, deviceId: string): Promise<void> {
  await assertDevice(db, cardId, deviceId);
  const card = await getCard(db, cardId);
  if (!card) throw new AppError('Carte introuvable.', 404);
  if (card.balanceCents > 0 || card.reservedCents > 0) {
    throw new AppError('Il reste un solde sur cette carte : demandez son remboursement à la buvette.', 409);
  }
  const repo = new CardWalletRepository();
  await db.batch([repo.buildForgetStatement(db, cardId), repo.buildRevokeAllStatement(db, cardId)] as any);
}

/** Le détail d'une transaction. Une recharge n'a pas d'articles : seule une vente en porte. */
export async function getMovement(db: Db, cardId: number, deviceId: string, movementId: number): Promise<MovementDetail> {
  await assertDevice(db, cardId, deviceId);
  const repo = new CardWalletRepository();
  const movement = await repo.movement(db, cardId, movementId);
  if (!movement) throw new AppError('Transaction introuvable.', 404);
  const sale = movement.saleId ? await repo.sale(db, movement.saleId) : undefined;
  const lines = sale && movement.type !== 'recharge' ? await repo.saleLines(db, sale.id) : [];
  return {
    id: movement.id,
    type: movement.type,
    amountCents: movement.amountCents,
    createdAt: movement.createdAt,
    lines,
    cashCents: movement.type === 'debit' ? sale?.cashCents ?? 0 : 0,
    cardCents: movement.type === 'debit' ? sale?.cardCents ?? 0 : 0
  };
}
