/**
 * Préparation d'un fichier avant dépôt.
 *
 * Deux raisons de passer par le navigateur plutôt que par le serveur :
 *
 *  1. Les Workers n'ont pas de bibliothèque de traitement d'image, et le plan gratuit
 *     exclut les transformations à la volée. Sans cette étape, une photo de téléphone
 *     de 4 Mo partirait telle quelle — c'est exactement ce que fait l'ancien site, qui
 *     sert des PNG d'équipes à 4,3 Mo.
 *  2. Les dimensions sont obligatoires côté API : c'est ce qui permet au rendu de
 *     réserver la place de l'image et de ne pas décaler la page.
 */

/** Au-delà, aucun écran d'adhérent n'en tire quoi que ce soit. */
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.82;

export interface PreparedUpload {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ce fichier n'est pas une image lisible."));
    };
    img.src = url;
  });
}

/**
 * Redimensionne et réencode si le gain est réel.
 *
 * Une image déjà petite et bien compressée est laissée telle quelle : la réencoder
 * ferait perdre de la qualité pour rien.
 */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.type === 'application/pdf') {
    return { blob: file, fileName: file.name, width: 0, height: 0 };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return { blob: file, fileName: file.name, width: img.naturalWidth, height: img.naturalHeight };
  context.drawImage(img, 0, 0, width, height);

  const encoded = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
  );

  // On ne garde le WebP que s'il est réellement plus léger : sur une petite image
  // déjà optimisée, le réencodage peut grossir le fichier.
  if (!encoded || encoded.size >= file.size) {
    return { blob: file, fileName: file.name, width: img.naturalWidth, height: img.naturalHeight };
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return { blob: encoded, fileName: `${baseName}.webp`, width, height };
}

/** Poids lisible, pour l'affichage de la médiathèque. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
