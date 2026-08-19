// Config du modèle d'attestation (partagée entre slices et générateur PDF).

export type AttestationConfig = {
  signatoryName: string;
  signatoryEmail: string;
  websiteUrl: string;
  /** JPEG en base64 (sans préfixe data:). `null` → le générateur utilise la signature par défaut bundlée. */
  signatureBase64: string | null;
};

export const DEFAULT_ATTESTATION_CONFIG = {
  signatoryName: 'Robert THAI',
  signatoryEmail: 'president@nozaybad.fr',
  websiteUrl: 'www.nozaybad.fr'
} as const;

/**
 * Plafond de la signature à l'upload (octets bruts JPEG). En base64 (~1,34×) on
 * reste sous la limite D1 de 100 KB par instruction SQL, même si le paramètre lié
 * était compté dans cette limite.
 */
export const MAX_SIGNATURE_BYTES = 48 * 1024;
