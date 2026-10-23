/**
 * Le justificatif d'une note de frais : une adresse `data:` stockée telle quelle en base.
 *
 * Une photo (WebP ou JPEG, compressée dans le navigateur) ou un PDF (envoyé tel quel :
 * une facture reçue par courriel n'a pas à être photographiée sur un écran).
 */

export function estJustificatifPdf(adresse: string | null | undefined): boolean {
  return !!adresse && adresse.startsWith('data:application/pdf');
}

/**
 * Le PDF en `Blob`, pour l'ouvrir dans un onglet : la CSP de l'admin interdit de le
 * cadrer (`object-src 'none'`, pas de `frame-src`), et un navigateur refuse d'ouvrir
 * une adresse `data:` en navigation de premier niveau.
 */
export function justificatifEnBlob(adresse: string): Blob {
  const virgule = adresse.indexOf(',');
  const binaire = atob(adresse.slice(virgule + 1));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: 'application/pdf' });
}
