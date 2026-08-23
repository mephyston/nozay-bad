import { type Db } from '@nba/db';
import { AttestationConfigRepository } from '../shared/attestation/repository';
import { MAX_SIGNATURE_BYTES, signatureKind } from '../shared/attestation/config';
import { InvalidSignatureError, SignatureTooLargeError } from '../shared/errors';

export type UploadAttestationSignatureInput = {
  /** Base64 de l'image, avec ou sans préfixe `data:image/...;base64,`. */
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
  const base64 = raw.replace(/^data:image\/[a-z+]+;base64,/i, '').replace(/\s/g, '');

  if (!base64) {
    throw new InvalidSignatureError();
  }
  /*
   * PNG et JPEG, reconnus à leurs premiers octets et non au type déclaré par le
   * navigateur — celui-ci vient du client et ne prouve rien.
   *
   * Le PNG est même le format qu'on préfère pour une signature : il garde la
   * transparence, là où le JPEG pose un rectangle blanc sur le document et bave autour
   * des traits fins. Il était refusé sans autre raison que l'ordre dans lequel les
   * choses ont été écrites.
   */
  if (signatureKind(base64) === null) {
    throw new InvalidSignatureError();
  }
  if (base64ByteLength(base64) > MAX_SIGNATURE_BYTES) {
    throw new SignatureTooLargeError(
      `Signature trop volumineuse (max ${Math.round(MAX_SIGNATURE_BYTES / 1024)} Ko). Réduisez l'image.`
    );
  }

  await new AttestationConfigRepository().updateSignature(db, base64);
}
