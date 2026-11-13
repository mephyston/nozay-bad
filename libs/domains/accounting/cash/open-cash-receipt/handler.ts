import { AppError, type Db } from '@nba/db';
import { getMemberById } from '@nba/members-api';
import { RECEIPT_QR_PREFIX, TOKEN_TTL_MS, payerEmailOf, randomToken, sha256 } from '../../shared/cash';
import { toReceiptView } from '../../shared/cash-store';
import { OpenCashReceiptRepository } from './repository';
import type { OpenCashReceiptInput, OpenCashReceiptOutput } from './dto';

/**
 * L'encaisseur ouvre un reçu : c'est sa signature, horodatée et attachée à son compte.
 *
 * Le reçu reste en attente tant que le payeur ne l'a pas signé ; il n'existe pas avant.
 * Un payeur adhérent est cherché dans la saison active, comme toute écriture qui s'y
 * rattachera à la remise.
 */
export async function openCashReceipt(
  db: Db,
  collectorEmail: string,
  input: OpenCashReceiptInput,
  now: Date = new Date()
): Promise<OpenCashReceiptOutput> {
  if (!collectorEmail) throw new AppError('Encaisseur inconnu.', 401);
  const repo = new OpenCashReceiptRepository();

  const seasonId = await repo.activeSeasonId(db);
  if (!seasonId) throw new AppError('Aucune saison active : impossible d’encaisser.', 400);

  const category = await repo.activeCategory(db, input.categoryId);
  if (!category) throw new AppError('Motif inconnu.', 400);

  let payerName = (input.payerName ?? '').trim();
  let payerEmail = input.payerEmail?.trim() || null;
  const payerMemberId = input.payerMemberId ?? null;
  if (payerMemberId !== null) {
    const member = await getMemberById(db, payerMemberId);
    if (!member) throw new AppError('Adhérent introuvable.', 404);
    if (member.seasonId !== seasonId) throw new AppError("Cet adhérent n'est pas inscrit sur la saison en cours.", 400);
    payerName = `${member.firstName} ${member.lastName}`.trim();
    payerEmail = payerEmailOf(member);
  }
  if (!payerName) throw new AppError('Le payeur doit être nommé.', 400);

  const token = randomToken();
  const qrExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  const row = await repo.insert(db, {
    seasonId,
    collectorEmail: collectorEmail.toLowerCase(),
    collectorName: input.collectorName.trim(),
    payerMemberId,
    payerName,
    payerEmail,
    amountCents: input.amountCents,
    categoryId: category.id,
    description: (input.description ?? '').trim(),
    status: 'pending',
    tokenHash: await sha256(token),
    tokenExpiresAt: qrExpiresAt,
    createdAt: now
  });

  return { receipt: toReceiptView(row, category.label), qr: RECEIPT_QR_PREFIX + token, qrExpiresAt: qrExpiresAt.toISOString() };
}
