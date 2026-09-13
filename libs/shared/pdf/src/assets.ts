/**
 * Une image prête à être embarquée dans un PDF.
 *
 * Les images du club (bande d'en-tête, bas de page, logo, tampon, partenaires) ne
 * sont plus empaquetées dans le worker : elles vivent dans R2, déposées depuis la
 * configuration du club, et arrivent ici en octets. Le base64 reste accepté pour ce
 * qui est encore stocké ainsi en base (la signature de l'attestation CSE).
 */
export type EmbeddedImage = { kind: 'jpg' | 'png' } & ({ base64: string } | { bytes: Uint8Array });

/** Le format se lit dans les premiers octets : un JPEG renommé `.png` casserait `embedPng`. */
export function imageKindOf(bytes: Uint8Array): 'jpg' | 'png' | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  return null;
}

/** Construit une image embarquable depuis des octets, ou `null` si le format n'est pas reconnu. */
export function imageFromBytes(bytes: ArrayBuffer | Uint8Array | null | undefined): EmbeddedImage | null {
  if (!bytes) return null;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const kind = imageKindOf(u8);
  return kind ? { kind, bytes: u8 } : null;
}
