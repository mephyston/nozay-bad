// Config du modèle d'attestation (partagée entre slices et générateur PDF).

export type AttestationConfig = {
  signatoryName: string;
  signatoryEmail: string;
  websiteUrl: string;
  /** Image en base64 (sans préfixe data:). `null` → le générateur utilise la signature par défaut bundlée. */
  signatureBase64: string | null;
};

/**
 * Format d'une signature, déduit de ses premiers octets.
 *
 * Lu dans l'image elle-même plutôt que stocké à côté : la colonne ne porte que du
 * base64, et un format rangé séparément se serait désynchronisé au premier remplacement.
 * Les deux signatures se reconnaissent sans ambiguïté — un PNG commence par les octets
 * `89 50 4E 47`, soit « iVBORw0KGgo » une fois encodé ; un JPEG par `FF D8 FF`, soit
 * « /9j/ ».
 */
export function signatureKind(base64: string): 'png' | 'jpeg' | null {
  if (base64.startsWith('iVBORw0KGgo')) return 'png';
  if (base64.startsWith('/9j/')) return 'jpeg';
  return null;
}

/** Type MIME correspondant, pour composer une data URL. */
export function signatureMimeType(base64: string): string {
  return signatureKind(base64) === 'png' ? 'image/png' : 'image/jpeg';
}

export const DEFAULT_ATTESTATION_CONFIG = {
  signatoryName: 'Robert THAI',
  signatoryEmail: 'president@nozaybad.fr',
  websiteUrl: 'www.nozaybad.fr'
} as const;

/**
 * Plafond de la signature à l'upload (octets bruts de l'image). En base64 (~1,34×) on
 * reste sous la limite D1 de 100 KB par instruction SQL, même si le paramètre lié
 * était compté dans cette limite.
 */
export const MAX_SIGNATURE_BYTES = 48 * 1024;
