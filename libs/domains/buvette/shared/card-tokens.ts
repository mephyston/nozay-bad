/**
 * Les deux jetons d'une carte, signés côté API.
 *
 * - `qr` : affiché par l'app du client, valable 60 secondes. Il prouve la présence d'un
 *   appareil non révoqué au moment du scan.
 * - `scan` : rendu à la caisse après ce contrôle, valable 5 minutes. Le bénévole a le temps de
 *   finir son panier sans que le QR code du client expire entre-temps.
 *
 * Aucun solde ni adresse dans le jeton : il désigne une carte, il ne porte aucune valeur.
 */
export const QR_TOKEN_TTL_SECONDS = 60;
export const SCAN_TOKEN_TTL_SECONDS = 300;

export type CardTokenKind = 'qr' | 'scan';

export interface CardTokenPayload {
  k: CardTokenKind;
  c: number;
  d: string;
  e: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signCardToken(
  secret: string,
  kind: CardTokenKind,
  cardId: number,
  deviceId: string,
  nowMs: number = Date.now()
): Promise<{ token: string; expiresAt: number }> {
  const ttl = kind === 'qr' ? QR_TOKEN_TTL_SECONDS : SCAN_TOKEN_TTL_SECONDS;
  const expiresAt = Math.floor(nowMs / 1000) + ttl;
  const payload: CardTokenPayload = { k: kind, c: cardId, d: deviceId, e: expiresAt };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), new TextEncoder().encode(body));
  return { token: `${body}.${toBase64Url(new Uint8Array(signature))}`, expiresAt };
}

/** Rend le contenu d'un jeton valable du genre attendu, `null` dans tous les autres cas. */
export async function verifyCardToken(
  secret: string,
  kind: CardTokenKind,
  token: string,
  nowMs: number = Date.now()
): Promise<CardTokenPayload | null> {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;
  try {
    const signatureBytes = fromBase64Url(signature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(secret),
      signatureBytes as BufferSource,
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as CardTokenPayload;
    if (payload.k !== kind || payload.e <= Math.floor(nowMs / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Le code à saisir, affiché sous le QR code quand la caméra ne lit pas : numéro de carte puis
 * 6 chiffres qui changent chaque minute. Il donne accès au solde comme le QR code : il expire
 * donc aussi, et il dépend de l'appareil, si bien qu'un appareil déconnecté n'en a plus de valable.
 */
const CARD_CODE_WINDOW_SECONDS = 60;
/** Le client le dicte, le bénévole le tape : la minute en cours et les deux précédentes. */
const CARD_CODE_PAST_WINDOWS = 2;

async function cardCodeDigits(secret: string, cardId: number, deviceId: string, window: number): Promise<string> {
  const message = new TextEncoder().encode(`code:${cardId}:${deviceId}:${window}`);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await importKey(secret), message));
  const value = new DataView(signature.buffer).getUint32(0) % 1_000_000;
  return String(value).padStart(6, '0');
}

function currentWindow(nowMs: number): number {
  return Math.floor(nowMs / 1000 / CARD_CODE_WINDOW_SECONDS);
}

export async function cardCode(secret: string, cardId: number, deviceId: string, nowMs: number = Date.now()): Promise<string> {
  return `${cardId}-${await cardCodeDigits(secret, cardId, deviceId, currentWindow(nowMs))}`;
}

/** Le tiret est facultatif : le clavier chiffré d'un téléphone n'en a pas. */
export function readCardCode(raw: string): { cardId: number; digits: string } | null {
  const match = /^(\d{1,9})[\s-]?(\d{6})$/.exec(raw.trim());
  return match ? { cardId: Number(match[1]), digits: match[2] } : null;
}

/** Rend l'appareil dont ce code est encore valable, parmi ceux de la carte qui restent ouverts. */
export async function findDeviceForCode(
  secret: string,
  code: { cardId: number; digits: string },
  deviceIds: string[],
  nowMs: number = Date.now()
): Promise<string | null> {
  const now = currentWindow(nowMs);
  for (const deviceId of deviceIds) {
    for (let window = now; window >= now - CARD_CODE_PAST_WINDOWS; window--) {
      if ((await cardCodeDigits(secret, code.cardId, deviceId, window)) === code.digits) return deviceId;
    }
  }
  return null;
}
