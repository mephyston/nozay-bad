/**
 * Compression d'un justificatif dans le navigateur.
 *
 * La photo est stockée **en base64 dans D1**, pas dans un objet-store : ce qui compte
 * n'est donc pas le poids du fichier choisi, mais celui de la chaîne enregistrée — environ
 * un tiers de plus que les octets qu'elle encode. Une photo de téléphone dépasse la limite
 * sans effort, et l'ancien contrôle se contentait de la refuser : à l'adhérent de se
 * débrouiller.
 *
 * On réduit donc, en deux temps : d'abord les dimensions, ce qui coûte peu à la lisibilité
 * d'un reçu ; puis la qualité, par paliers, jusqu'à tenir dans le budget. Ce n'est
 * qu'après avoir épuisé les deux qu'on refuse.
 */

/** Ce que la chaîne enregistrée ne doit pas dépasser. */
export const BUDGET_OCTETS = 800 * 1024;

/** Au-delà, un reçu ne gagne plus en lisibilité, seulement en poids. */
const LARGEURS = [1600, 1200, 900];
const QUALITES = [0.82, 0.7, 0.6, 0.5, 0.4];

/** Poids réel d'une adresse `data:` : c'est elle qui part en base. */
export function poidsDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bourrage = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - bourrage;
}

async function decoder(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // `imageOrientation` : sans elle, une photo prise en portrait ressort couchée — le
  // capteur enregistre l'orientation dans les métadonnées plutôt que dans les pixels.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Navigateur sans l'option : on retombe sur l'élément image. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image illisible.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const dimensions = (source: ImageBitmap | HTMLImageElement) => ({
  largeur: 'naturalWidth' in source ? source.naturalWidth : source.width,
  hauteur: 'naturalHeight' in source ? source.naturalHeight : source.height
});

/**
 * Rend l'adresse `data:` la plus lisible qui tienne dans le budget.
 *
 * Lève quand aucune combinaison n'y parvient — c'est-à-dire jamais pour une photo de
 * reçu, mais possiblement pour une capture d'écran très large et très bruitée.
 */
export async function compresserJustificatif(
  file: File,
  budget = BUDGET_OCTETS
): Promise<{ dataUrl: string; octets: number; octetsOrigine: number }> {
  const source = await decoder(file);
  const { largeur, hauteur } = dimensions(source);
  if (!largeur || !hauteur) throw new Error('Image illisible.');

  const canvas = document.createElement('canvas');
  const contexte = canvas.getContext('2d');
  if (!contexte) throw new Error('Compression impossible sur ce navigateur.');

  /*
    Le WebP est nettement plus compact qu'un JPEG à qualité égale, mais tous les
    navigateurs ne l'encodent pas : `toDataURL` retombe alors silencieusement sur du PNG,
    qui est *plus* lourd. On vérifie donc ce qu'on a réellement obtenu.
  */
  const formats = ['image/webp', 'image/jpeg'];

  let meilleur: string | null = null;
  for (const largeurCible of LARGEURS) {
    const echelle = Math.min(1, largeurCible / largeur);
    canvas.width = Math.round(largeur * echelle);
    canvas.height = Math.round(hauteur * echelle);
    contexte.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);

    for (const format of formats) {
      for (const qualite of QUALITES) {
        const essai = canvas.toDataURL(format, qualite);
        if (!essai.startsWith(`data:${format}`)) break; // format non encodé ici
        if (poidsDataUrl(essai) <= budget) {
          meilleur = essai;
          break;
        }
      }
      if (meilleur) break;
    }
    if (meilleur) break;
  }

  if ('close' in source) source.close();
  if (!meilleur) {
    throw new Error(
      "Ce justificatif reste trop lourd même après compression. Recadrez-le ou photographiez-le de plus près."
    );
  }

  return { dataUrl: meilleur, octets: poidsDataUrl(meilleur), octetsOrigine: file.size };
}
