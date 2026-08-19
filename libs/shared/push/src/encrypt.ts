import { base64UrlDecode, concatBytes, utf8, type Bytes } from './base64';

/**
 * Chiffrement des messages Web Push — RFC 8291, encodage `aes128gcm`.
 *
 * L'ancien schéma `aesgcm` (draft-04) n'est PAS implémenté : le service de push
 * d'Apple, seul chemin possible vers Safari/iOS, ne reconnaît que `aes128gcm`.
 */

/** Taille de record annoncée dans l'en-tête. Une notification tient en un seul record. */
const RECORD_SIZE = 4096;
/** Point EC P-256 non compressé : 0x04 || X(32) || Y(32). */
const PUBLIC_KEY_LENGTH = 65;
/** salt(16) + rs(4) + idlen(1) + clé publique serveur(65). */
const HEADER_LENGTH = 16 + 4 + 1 + PUBLIC_KEY_LENGTH;
/** Marqueur de fin d'enregistrement (§2 de la RFC 8188). */
const RECORD_DELIMITER = 0x02;
/** Étiquette GCM. */
const TAG_LENGTH = 16;

/**
 * Plafond de charge utile. Les services de push garantissent 4 096 octets pour le
 * corps chiffré ; on en déduit l'en-tête, le délimiteur et l'étiquette GCM.
 */
export const MAX_PAYLOAD_BYTES = RECORD_SIZE - HEADER_LENGTH - 1 - TAG_LENGTH;

export interface PushSubscriptionKeys {
  /** Clé publique P-256 de l'agent utilisateur, base64url (65 octets). */
  p256dh: string;
  /** Secret d'authentification, base64url (16 octets). */
  auth: string;
}

/** Injection déterministe réservée aux tests (vecteurs de l'annexe A de la RFC 8291). */
export interface EncryptOverrides {
  salt?: Bytes;
  serverKeys?: CryptoKeyPair;
}

async function hmacSha256(key: Bytes, data: Bytes): Promise<Bytes> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign'
  ]);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

export async function generateServerKeys(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
}

/**
 * Chiffre `payload` pour un abonnement donné et renvoie le corps HTTP complet
 * (en-tête `aes128gcm` suivi du record chiffré).
 */
export async function encryptPayload(
  keys: PushSubscriptionKeys,
  payload: string,
  overrides: EncryptOverrides = {}
): Promise<Bytes> {
  const plaintext = utf8(payload);
  if (plaintext.length > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Charge utile de ${plaintext.length} octets : le maximum est de ${MAX_PAYLOAD_BYTES} octets.`
    );
  }

  const uaPublicBytes = base64UrlDecode(keys.p256dh);
  if (uaPublicBytes.length !== PUBLIC_KEY_LENGTH) {
    throw new Error("Clé publique d'abonnement invalide (p256dh).");
  }
  const authSecret = base64UrlDecode(keys.auth);

  const salt = overrides.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = overrides.serverKeys ?? (await generateServerKeys());

  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  const serverPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, serverKeys.privateKey, 256)
  );

  // §3.4 : le secret ECDH est d'abord combiné au secret d'authentification, ce qui
  // lie la clé de contenu aux deux parties de l'abonnement.
  const prkKey = await hmacSha256(authSecret, ecdhSecret);
  const keyInfo = concatBytes(utf8('WebPush: info'), Uint8Array.of(0x00), uaPublicBytes, serverPublicBytes);
  const ikm = await hmacSha256(prkKey, concatBytes(keyInfo, Uint8Array.of(0x01)));

  const prk = await hmacSha256(salt, ikm);
  const cek = (
    await hmacSha256(prk, concatBytes(utf8('Content-Encoding: aes128gcm'), Uint8Array.of(0x00, 0x01)))
  ).slice(0, 16);
  const nonce = (
    await hmacSha256(prk, concatBytes(utf8('Content-Encoding: nonce'), Uint8Array.of(0x00, 0x01)))
  ).slice(0, 12);

  const contentKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: TAG_LENGTH * 8 },
      contentKey,
      // Record unique : le délimiteur 0x02 signale le dernier enregistrement.
      concatBytes(plaintext, Uint8Array.of(RECORD_DELIMITER))
    )
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, RECORD_SIZE, false);

  return concatBytes(salt, recordSize, Uint8Array.of(PUBLIC_KEY_LENGTH), serverPublicBytes, ciphertext);
}
