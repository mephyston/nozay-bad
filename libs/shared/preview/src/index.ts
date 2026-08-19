/**
 * Jetons d'aperçu.
 *
 * Un brouillon doit pouvoir être relu à son adresse réelle avant publication, sans
 * être accessible à qui passerait par là. Le lien porte donc une signature à durée
 * limitée, vérifiée ici puis convertie en droit de lire les brouillons — droit que le
 * site public n'a jamais autrement.
 *
 * HMAC plutôt qu'un jeton opaque en base : rien à stocker, rien à nettoyer, et un lien
 * périmé le reste sans intervention.
 */

/** Deux heures : le temps d'une relecture, pas d'un partage durable. */
export const PREVIEW_TTL_SECONDS = 2 * 60 * 60;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/** Comparaison à temps constant : la signature ne doit pas fuir par la durée. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createPreviewToken(
  path: string,
  secret: string,
  now: number = Date.now()
): Promise<string> {
  const expiry = Math.floor(now / 1000) + PREVIEW_TTL_SECONDS;
  // Le chemin entre dans la signature : un jeton valable pour une page ne doit pas
  // ouvrir toutes les autres.
  return `${expiry}.${await sign(`${path}:${expiry}`, secret)}`;
}

export async function verifyPreviewToken(
  token: string | null,
  path: string,
  secret: string | undefined,
  now: number = Date.now()
): Promise<boolean> {
  // Échec en fermeture : sans secret configuré, l'aperçu n'existe pas. Le contraire
  // ouvrirait tous les brouillons dès qu'une variable manque au déploiement.
  if (!token || !secret) return false;

  const separator = token.indexOf('.');
  if (separator < 1) return false;

  const expiry = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiry) || expiry * 1000 < now) return false;

  return timingSafeEqual(signature, await sign(`${path}:${expiry}`, secret));
}
