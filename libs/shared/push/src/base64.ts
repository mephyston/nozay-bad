/**
 * Base64url (RFC 4648 §5) sur `Uint8Array`.
 *
 * Le Worker `nba-api` n'active pas `nodejs_compat` : pas de `Buffer`, on s'appuie
 * uniquement sur `btoa`/`atob`, disponibles partout (Workers, navigateur, Node 18+).
 */

/**
 * Vue sur un `ArrayBuffer` non partagé. WebCrypto n'accepte pas un
 * `Uint8Array<ArrayBufferLike>`, qui pourrait pointer sur un `SharedArrayBuffer`.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(value: string): Bytes {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function concatBytes(...chunks: Uint8Array[]): Bytes {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export const utf8 = (value: string): Bytes => new TextEncoder().encode(value) as Bytes;
