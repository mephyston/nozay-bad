import { type Db } from '@nba/db';
import { getEffectiveConfig } from '../shared/attestation/repository';
import { defaultSignature } from '../shared/attestation/assets';

export type GetAttestationConfigOutput = {
  signatoryName: string;
  signatoryEmail: string;
  websiteUrl: string;
  signature: {
    /** true si aucune signature n'a été uploadée (celle du modèle d'origine est utilisée). */
    isDefault: boolean;
    /** Data URL JPEG pour l'aperçu dans l'admin (signature effective : uploadée ou défaut). */
    dataUrl: string;
  };
};

export async function getAttestationConfig(db: Db): Promise<GetAttestationConfigOutput> {
  const config = await getEffectiveConfig(db);
  const base64 = config.signatureBase64 ?? defaultSignature.base64;
  return {
    signatoryName: config.signatoryName,
    signatoryEmail: config.signatoryEmail,
    websiteUrl: config.websiteUrl,
    signature: {
      isDefault: config.signatureBase64 === null,
      dataUrl: `data:image/jpeg;base64,${base64}`
    }
  };
}
