import { SignJWT, jwtVerify } from 'jose';

/**
 * Le cookie de l'appareil : 400 jours, le maximum qu'admet un navigateur. Il désigne la carte
 * et l'appareil, sans solde ni adresse. L'API contrôle à chaque appel que l'appareil n'a pas
 * été déconnecté : c'est elle qui décide, le cookie seul n'ouvre rien.
 */
export const CARD_COOKIE = 'nba_carte';
const CARD_TTL_SECONDS = 400 * 24 * 3600;
export const PENDING_COOKIE = 'nba_carte_code';
const PENDING_TTL_SECONDS = 600;

const key = (secret: string) => new TextEncoder().encode(secret);

export interface CardSession {
  cardId: number;
  deviceId: string;
}

export async function signCardSession(session: CardSession, secret: string): Promise<string> {
  return new SignJWT({ c: session.cardId, d: session.deviceId, k: 'card' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${CARD_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifyCardSession(token: string, secret: string): Promise<CardSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    if (payload.k !== 'card' || typeof payload.c !== 'number' || typeof payload.d !== 'string') return null;
    return { cardId: payload.c, deviceId: payload.d };
  } catch {
    return null;
  }
}

/** Lie la saisie du code à l'adresse, sans laisser le navigateur la choisir à ce moment-là. */
export async function signPending(email: string, secret: string): Promise<string> {
  return new SignJWT({ e: email, k: 'pending' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifyPending(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    return payload.k === 'pending' && typeof payload.e === 'string' ? payload.e : null;
  } catch {
    return null;
  }
}

function cookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export const cardCookie = (token: string, secure: boolean) => cookie(CARD_COOKIE, token, CARD_TTL_SECONDS, secure);
export const clearCardCookie = (secure: boolean) => cookie(CARD_COOKIE, '', 0, secure);
export const pendingCookie = (token: string, secure: boolean) => cookie(PENDING_COOKIE, token, PENDING_TTL_SECONDS, secure);
export const clearPendingCookie = (secure: boolean) => cookie(PENDING_COOKIE, '', 0, secure);

export function readCookie(header: string | null, name: string): string | null {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}
