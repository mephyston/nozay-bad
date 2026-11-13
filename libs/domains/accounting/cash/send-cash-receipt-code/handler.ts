import { AppError, type Db } from '@nba/db';
import { CODE_TTL_MS, codeMail, randomCode, sha256, type CashMailer } from '../../shared/cash';
import { findReceipt, maskEmail, updateReceipt } from '../../shared/cash-store';

/**
 * Le secours du QR code : un code à 4 chiffres part sur l'adresse du payeur, qu'il lit à
 * l'encaisseur. Un nouvel envoi remplace l'ancien code et remet les essais à zéro.
 */
export async function sendCashReceiptCode(
  db: Db,
  mailer: CashMailer,
  actorEmail: string,
  id: number,
  now = new Date()
): Promise<{ sentTo: string | null; expiresAt: string }> {
  const found = await findReceipt(db, id);
  if (!found || found.receipt.collectorEmail !== actorEmail.toLowerCase()) throw new AppError('Reçu introuvable.', 404);
  const receipt = found.receipt;
  if (receipt.status !== 'pending') throw new AppError('Ce reçu n’attend plus de signature.', 409);
  if (!receipt.payerEmail) throw new AppError("Aucune adresse connue pour ce payeur : faites-le signer à l'écran.", 400);

  const code = randomCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  await updateReceipt(db, id, { codeHash: await sha256(`${id}:${code}`), codeExpiresAt: expiresAt, codeAttempts: 0 });
  await mailer(receipt.payerEmail, codeMail({ code, amountCents: receipt.amountCents, collectorName: receipt.collectorName }));
  return { sentTo: maskEmail(receipt.payerEmail), expiresAt: expiresAt.toISOString() };
}
