/**
 * Encaissement d'espèces (RF-ACC-003) : ce que partagent les tranches de `cash/`.
 *
 * Jetons et codes ne sont jamais gardés en clair : seul leur SHA-256 va en base. Le jeton
 * du QR code est long et aléatoire (on ne le devine pas) ; le code à 4 chiffres est court,
 * d'où sa durée de vie et son plafond d'essais.
 */

/** Le QR code d'un reçu ou d'une remise ne sert que 2 minutes : il faut être là. */
export const TOKEN_TTL_MS = 2 * 60 * 1000;
/** Le code reçu par courriel : le temps que le message arrive et qu'on le lise. */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 3;
/** Préfixe du contenu des QR codes : le lecteur reconnaît un reçu, et rien d'autre. */
export const RECEIPT_QR_PREFIX = 'nba-recu:';
export const HANDOVER_QR_PREFIX = 'nba-remise:';
/** Une signature au doigt, en PNG base64 : bornée pour tenir dans une ligne D1. */
export const SIGNATURE_MAX_LENGTH = 200_000;

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

/** 32 octets aléatoires, en hexadécimal. */
export function randomToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Un code à 4 chiffres, tiré sans biais. */
export function randomCode(): string {
  const max = 10_000;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return String(buf[0] % max).padStart(4, '0');
}

/** Le jeton contenu dans un QR code, ou null s'il n'a pas le préfixe attendu. */
export function tokenFromQr(content: string, prefix: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith(prefix)) return null;
  const token = trimmed.slice(prefix.length);
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}

/** L'adresse où joindre le payeur : la sienne, sinon celle d'un parent. */
export function payerEmailOf(member: { email: string | null; parent1Email: string | null; parent2Email: string | null }): string | null {
  return member.email || member.parent1Email || member.parent2Email || null;
}

/** Une signature au doigt valide : une image PNG en base64, de taille raisonnable. */
export function isSignatureImage(value: string): boolean {
  return value.startsWith('data:image/png;base64,') && value.length <= SIGNATURE_MAX_LENGTH;
}

export interface CashMail { subject: string; html: string; text: string }

/** Envoie un courriel au payeur. Injecté par l'API, qui seule connaît la messagerie. */
export type CashMailer = (to: string, mail: CashMail) => Promise<void>;

const euros = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100).replace(/\s/g, ' ');

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function codeMail(input: { code: string; amountCents: number; collectorName: string }): CashMail {
  const line = `Vous remettez ${euros(input.amountCents)} en espèces à ${input.collectorName}.`;
  return {
    subject: `Votre code de confirmation : ${input.code}`,
    text: `${line}\n\nDonnez-lui ce code pour signer le reçu : ${input.code}\n\nIl est valable 10 minutes. Si vous ne remettez pas d'argent en ce moment, ignorez ce message.`,
    html: `<p>${escape(line)}</p><p>Donnez-lui ce code pour signer le reçu :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${input.code}</p><p>Il est valable 10 minutes. Si vous ne remettez pas d'argent en ce moment, ignorez ce message.</p>`
  };
}

export function receiptMail(input: {
  receiptId: number;
  amountCents: number;
  collectorName: string;
  payerName: string;
  motif: string;
  signedAt: Date;
}): CashMail {
  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(input.signedAt);
  const lines = [
    `Reçu n° ${input.receiptId}`,
    `Montant : ${euros(input.amountCents)} en espèces`,
    `Pour : ${input.payerName} — ${input.motif}`,
    `Remis à : ${input.collectorName}`,
    `Le : ${date}`
  ];
  const footer = "Gardez ce message : c'est votre exemplaire du reçu. Si vous n'avez pas remis cette somme, répondez à ce courriel.";
  return {
    subject: `Votre reçu : ${euros(input.amountCents)} remis en espèces`,
    text: `${lines.join('\n')}\n\n${footer}`,
    html: `<p>${lines.map(escape).join('<br>')}</p><p>${escape(footer)}</p>`
  };
}

/** Ce que l'API fournit aux routes qui écrivent au payeur : la messagerie, par requête. */
export interface CashMailDeps {
  mailerFor: (env: unknown) => CashMailer;
}

/**
 * Envoie son reçu au payeur, sans jamais défaire la signature : un reçu scellé l'est,
 * que le courriel parte ou non. L'échec se journalise.
 */
export async function sendReceiptMail(
  mailer: CashMailer,
  receipt: { id: number; payerEmail: string | null; amountCents: number; collectorName: string; payerName: string; description: string },
  motif: string,
  signedAt: Date
): Promise<void> {
  if (!receipt.payerEmail) return;
  try {
    await mailer(receipt.payerEmail, receiptMail({
      receiptId: receipt.id,
      amountCents: receipt.amountCents,
      collectorName: receipt.collectorName,
      payerName: receipt.payerName,
      motif: receipt.description ? `${motif} (${receipt.description})` : motif,
      signedAt
    }));
  } catch (err) {
    console.error(`[espèces] reçu n°${receipt.id} : courriel non parti`, err);
  }
}
