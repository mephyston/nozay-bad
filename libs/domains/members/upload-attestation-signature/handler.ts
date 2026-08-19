import { type Db } from '@nba/db';
import { AttestationConfigRepository } from '../shared/attestation/repository';
import { MAX_SIGNATURE_BYTES } from '../shared/attestation/config';
import { InvalidSignatureError, SignatureTooLargeError } from '../shared/errors';

export type UploadAttestationSignatureInput = {
  /** Base64 du JPEG, avec ou sans préfixe `data:image/jpeg;base64,`. */
  signature: string;
};

/** Nombre d'octets décodés représentés par une chaîne base64 (sans la décoder). */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function uploadAttestationSignature(db: Db, input: UploadAttestationSignatureInput): Promise<void> {
  const raw = (input.signature || '').trim();
  // Retire un éventuel préfixe data URL et tout espace/retour ligne.
  const base64 = raw.replace(/^data:image\/jpe?g;base64,/i, '').replace(/\s/g, '');

  if (!base64) {
    throw new InvalidSignatureError();
  }
  // Signature JPEG : les octets commencent par FF D8 FF → base64 « /9j/ ».
  if (!base64.startsWith('/9j/')) {
    throw new InvalidSignatureError();
  }
  if (base64ByteLength(base64) > MAX_SIGNATURE_BYTES) {
    throw new SignatureTooLargeError(
      `Signature trop volumineuse (max ${Math.round(MAX_SIGNATURE_BYTES / 1024)} Ko). Réduisez l'image.`
    );
  }

  await new AttestationConfigRepository().updateSignature(db, base64);
}
