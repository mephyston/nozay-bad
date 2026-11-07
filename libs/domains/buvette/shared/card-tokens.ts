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
