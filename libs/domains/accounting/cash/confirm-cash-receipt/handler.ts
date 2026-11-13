import { AppError, type Db } from '@nba/db';
import { RECEIPT_QR_PREFIX, sendReceiptMail, sha256, tokenFromQr, type CashMailer } from '../../shared/cash';
import { findReceiptByToken, sealReceipt } from '../../shared/cash-store';

export interface CashReceiptPreview {
  id: number;
  amountCents: number;
  collectorName: string;
  payerName: string;
  motif: string;
  description: string;
  status: 'pending' | 'sealed';
}

interface Household { email: string; memberIds: number[] }

/**
 * Le reçu désigné par un QR code, s'il est bien pour ce foyer et encore valable.
 *
 * Un QR code périmé, inconnu ou destiné à un autre foyer répond la même chose : rien ne
 * doit permettre de deviner qu'un reçu existe pour quelqu'un d'autre.
 */
async function receiptFor(db: Db, qr: string, household: Household, now: Date) {
  const token = tokenFromQr(qr, RECEIPT_QR_PREFIX);
  const found = token ? await findReceiptByToken(db, await sha256(token)) : undefined;
  const r = found?.receipt;
  const valid = r && r.status === 'pending' && r.tokenExpiresAt && r.tokenExpiresAt.getTime() >= now.getTime()
    && r.payerMemberId !== null && household.memberIds.includes(r.payerMemberId);
  if (!found || !valid) throw new AppError('Ce QR code n’est pas valable pour vous. Demandez-en un nouveau.', 404);
  return found;
}

const preview = (found: NonNullable<Awaited<ReturnType<typeof findReceiptByToken>>>, status: 'pending' | 'sealed'): CashReceiptPreview => ({
  id: found.receipt.id,
  amountCents: found.receipt.amountCents,
  collectorName: found.receipt.collectorName,
  payerName: found.receipt.payerName,
  motif: found.categoryLabel,
  description: found.receipt.description,
  status
});

/** Ce que le payeur s'apprête à signer : montant, motif, encaisseur. */
export async function previewCashReceipt(db: Db, qr: string, household: Household, now = new Date()): Promise<CashReceiptPreview> {
  return preview(await receiptFor(db, qr, household, now), 'pending');
}

/** Le payeur confirme depuis son espace, connecté : le reçu est scellé à son adresse. */
export async function confirmCashReceipt(db: Db, mailer: CashMailer, qr: string, household: Household, now = new Date()): Promise<CashReceiptPreview> {
  const found = await receiptFor(db, qr, household, now);
  const sealed = await sealReceipt(db, found.receipt.id, { signatureMethod: 'qr', signedBy: household.email.toLowerCase(), signedAt: now });
  if (!sealed) throw new AppError('Ce reçu vient d’être signé autrement.', 409);
  await sendReceiptMail(mailer, found.receipt, found.categoryLabel, now);
  return preview(found, 'sealed');
}
