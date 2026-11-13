import { AppError, type Db } from '@nba/db';
import { getPaymentMethodByCode } from '../../config/queries';
import { HANDOVER_QR_PREFIX, isSignatureImage, sha256, tokenFromQr } from '../../shared/cash';
import { findHandover, findHandoverByToken, handoverReceipts, type CashHandoverRow } from '../../shared/cash-store';
import { SignCashHandoverRepository, type CashEntry } from './repository';

/** Le moyen « Espèces » : son compte (la Caisse) et le statut d'une écriture en espèces. */
const CASH_METHOD_CODE = 'especes';

const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

/**
 * Scelle la remise et passe ses écritures, au nom du trésorier qui l'a ouverte.
 *
 * C'est l'acte comptable : une recette par reçu, en Caisse, dans la catégorie du reçu,
 * rattachée au payeur et datée du jour où l'argent a été remis au gymnase ; puis l'écart
 * entre le compté et la somme des reçus, rattaché à cette remise. La signature de
 * l'encaisseur ne fait que clore un acte que le trésorier a ouvert et chiffré.
 */
async function seal(db: Db, handover: CashHandoverRow, signature: { signatureMethod: CashHandoverRow['signatureMethod']; signatureData: string | null }, now: Date) {
  if (handover.status !== 'pending') throw new AppError('Cette remise n’attend plus de signature.', 409);
  const method = await getPaymentMethodByCode(db, CASH_METHOD_CODE);
  if (!method) throw new AppError('Le moyen de paiement « Espèces » est introuvable.', 500);

  const rows = await handoverReceipts(db, handover.id);
  const receipts = rows.map(({ receipt: r }) => ({
    id: r.id,
    entry: {
      seasonId: r.seasonId,
      type: 'recette',
      accountId: method.defaultAccountId,
      paymentMethodId: method.id,
      categoryId: r.categoryId,
      amountCents: r.amountCents,
      date: day(r.signedAt ?? r.createdAt),
      description: `Espèces — ${r.payerName}${r.description ? ` (${r.description})` : ''}, remis à ${r.collectorName}`,
      reference: `Reçu n°${r.id} / remise n°${handover.id}`,
      memberId: r.payerMemberId,
      status: method.defaultEntryStatus,
      createdAt: now
    } satisfies CashEntry
  }));

  const gapCents = handover.countedCents - handover.expectedCents;
  const gap: CashEntry | null = gapCents === 0 || !handover.gapCategoryId ? null : {
    seasonId: handover.seasonId,
    type: gapCents > 0 ? 'recette' : 'depense',
    accountId: method.defaultAccountId,
    paymentMethodId: method.id,
    categoryId: handover.gapCategoryId,
    amountCents: Math.abs(gapCents),
    date: day(now),
    description: `Écart de remise d'espèces : ${gapCents > 0 ? 'excédent' : 'manque'} de ${euros(Math.abs(gapCents))} (${handover.collectorEmail})`,
    reference: `Remise n°${handover.id}`,
    memberId: null,
    status: method.defaultEntryStatus,
    createdAt: now
  };

  const sealed = await new SignCashHandoverRepository().seal(db, handover, receipts, gap, { ...signature, signedAt: now });
  if (!sealed) throw new AppError('Cette remise vient d’être signée autrement.', 409);
  return { id: handover.id, status: 'sealed' as const, receipts: receipts.length, gapCents };
}

/** L'encaisseur scanne le QR code de la remise depuis l'admin, connecté avec son propre compte. */
export async function confirmCashHandover(db: Db, actorEmail: string, qr: string, now = new Date()) {
  const token = tokenFromQr(qr, HANDOVER_QR_PREFIX);
  const handover = token ? await findHandoverByToken(db, await sha256(token)) : undefined;
  const valid = handover && handover.status === 'pending' && handover.tokenExpiresAt && handover.tokenExpiresAt.getTime() >= now.getTime()
    && handover.collectorEmail === actorEmail.toLowerCase();
  if (!handover || !valid) throw new AppError('Ce QR code de remise n’est pas valable pour vous.', 404);
  return await seal(db, handover, { signatureMethod: 'admin', signatureData: null }, now);
}

/** Dernier recours : l'encaisseur signe au doigt sur l'écran du trésorier. */
export async function signCashHandover(db: Db, id: number, signature: string, now = new Date()) {
  if (!isSignatureImage(signature)) throw new AppError('Signature illisible.', 400);
  const handover = await findHandover(db, id);
  if (!handover) throw new AppError('Remise introuvable.', 404);
  return await seal(db, handover, { signatureMethod: 'signature', signatureData: signature }, now);
}
