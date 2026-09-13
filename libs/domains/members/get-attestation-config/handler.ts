import { type Db } from '@nba/db';
import { signatureMimeType } from '../shared/attestation/config';
import { getEffectiveConfig } from '../shared/attestation/repository';

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
  const base64 = config.signatureBase64;
  return {
    signatoryName: config.signatoryName,
    signatoryEmail: config.signatoryEmail,
    websiteUrl: config.websiteUrl,
    signature: {
      isDefault: base64 === null,
      // Le type suit l'image : un PNG servi en `image/jpeg` ne s'affiche pas.
      // Sans signature déposée, rien à afficher : l'attestation sort sans image.
      dataUrl: base64 ? `data:${signatureMimeType(base64)};base64,${base64}` : ''
    }
  };
}
