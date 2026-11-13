import { AppError, type Db } from '@nba/db';
import { CODE_MAX_ATTEMPTS, isSignatureImage, sendReceiptMail, sha256, type CashMailer } from '../../shared/cash';
import { findReceipt, sealReceipt, toReceiptView, updateReceipt, type CashReceiptView } from '../../shared/cash-store';

async function pendingReceiptOf(db: Db, actorEmail: string, id: number) {
  const found = await findReceipt(db, id);
  if (!found || found.receipt.collectorEmail !== actorEmail.toLowerCase()) throw new AppError('Reçu introuvable.', 404);
  if (found.receipt.status !== 'pending') throw new AppError('Ce reçu n’attend plus de signature.', 409);
  return found;
}

async function seal(db: Db, mailer: CashMailer, found: NonNullable<Awaited<ReturnType<typeof findReceipt>>>, values: Parameters<typeof sealReceipt>[2]) {
  if (!(await sealReceipt(db, found.receipt.id, values))) throw new AppError('Ce reçu vient d’être signé autrement.', 409);
  await sendReceiptMail(mailer, found.receipt, found.categoryLabel, values.signedAt);
  return toReceiptView({ ...found.receipt, ...values, status: 'sealed' }, found.categoryLabel);
}

/**
 * Le payeur a lu à l'encaisseur le code reçu sur son adresse : il était là, et d'accord.
 * Trois essais au plus ; au-delà, il faut envoyer un nouveau code.
 */
export async function signWithCode(db: Db, mailer: CashMailer, actorEmail: string, id: number, code: string, now = new Date()): Promise<CashReceiptView> {
  const found = await pendingReceiptOf(db, actorEmail, id);
  const r = found.receipt;
  if (!r.codeHash || !r.codeExpiresAt) throw new AppError('Aucun code envoyé pour ce reçu.', 400);
  if (r.codeExpiresAt.getTime() < now.getTime()) throw new AppError('Code expiré : envoyez-en un nouveau.', 400);
  if (r.codeAttempts >= CODE_MAX_ATTEMPTS) throw new AppError('Trop d’essais : envoyez un nouveau code.', 429);
  if ((await sha256(`${id}:${code}`)) !== r.codeHash) {
    await updateReceipt(db, id, { codeAttempts: r.codeAttempts + 1 });
    const left = CODE_MAX_ATTEMPTS - r.codeAttempts - 1;
    throw new AppError(left > 0 ? `Code incorrect. Encore ${left} essai(s).` : 'Code incorrect. Envoyez un nouveau code.', 400);
  }
  return await seal(db, mailer, found, { signatureMethod: 'code', signedBy: r.payerEmail ?? '', signedAt: now });
}

/**
 * Dernier recours : le payeur signe au doigt sur l'écran de l'encaisseur. Le reçu le dit,
 * et le bureau voit ces reçus à part — tout s'est passé sur le téléphone du receveur.
 */
export async function signWithSignature(db: Db, mailer: CashMailer, actorEmail: string, id: number, signature: string, now = new Date()): Promise<CashReceiptView> {
  if (!isSignatureImage(signature)) throw new AppError('Signature illisible.', 400);
  const found = await pendingReceiptOf(db, actorEmail, id);
  return await seal(db, mailer, found, { signatureMethod: 'signature', signedBy: 'signature', signatureData: signature, signedAt: now });
}
