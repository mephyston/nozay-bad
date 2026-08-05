import { base64UrlDecode, base64UrlEncode, utf8 } from './base64';

/**
 * VAPID — RFC 8292. Identifie le serveur applicatif auprès du service de push.
 *
 * Le JWT ES256 est signé directement en WebCrypto plutôt qu'avec `jose` : le Worker
 * `nba-api` tourne sans `nodejs_compat` et la signature P1363 renvoyée par
 * `crypto.subtle.sign` est exactement le format attendu par JWS ES256.
 */

export interface VapidKeys {
  /** `mailto:` ou URL du site, joignable par l'opérateur du service de push. */
  subject: string;
  /** Clé publique P-256 non compressée, base64url (65 octets). */
  publicKey: string;
  /** Scalaire privé, base64url (32 octets). */
  privateKey: string;
}

/** Durée de vie du JWT. La RFC 8292 impose au maximum 24 h. */
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

async function importSigningKey(vapid: VapidKeys): Promise<CryptoKey> {
  const publicBytes = base64UrlDecode(vapid.publicKey);
  if (publicBytes.length !== 65) {
    throw new Error('Clé publique VAPID invalide (65 octets non compressés attendus).');
  }
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(publicBytes.slice(1, 33)),
      y: base64UrlEncode(publicBytes.slice(33, 65)),
      d: vapid.privateKey,
      ext: true
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Construit l'en-tête `Authorization` du schéma `vapid` pour un endpoint donné.
 * L'audience est l'origine de l'endpoint : un jeton n'est valable que pour le
 * service de push auquel il est destiné.
 */
export async function buildVapidAuthorization(
  endpoint: string,
  vapid: VapidKeys,
  now: number = Date.now()
): Promise<string> {
  if (!vapid.subject || !vapid.publicKey || !vapid.privateKey) {
    throw new Error('Configuration VAPID incomplète (subject, publicKey, privateKey).');
  }

  const header = base64UrlEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64UrlEncode(
    utf8(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
        sub: vapid.subject
      })
    )
  );

  const signingInput = `${header}.${claims}`;
  const key = await importSigningKey(vapid);
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(signingInput))
  );

  return `vapid t=${signingInput}.${base64UrlEncode(signature)}, k=${vapid.publicKey}`;
}

/**
 * Génère une paire de clés VAPID. Utilisé par `scripts/generate-vapid-keys.mjs`,
 * une seule fois par environnement : la clé publique est inlinée au build du
 * storefront, la privée est posée en secret de Worker.
 */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify'
  ]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (!jwk.d) {
    throw new Error('Export de la clé privée VAPID impossible.');
  }
  return { publicKey: base64UrlEncode(publicKey), privateKey: jwk.d };
}
