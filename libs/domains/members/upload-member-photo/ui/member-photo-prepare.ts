/**
 * Préparation d'un portrait avant dépôt : recadrage carré centré et réencodage WebP.
 *
 * Écrit ici plutôt qu'emprunté à la médiathèque (`cms/media/.../media-upload.ts`) :
 * `members` ne dépend pas de `cms`, et les deux besoins divergent — la médiathèque
 * préserve le cadrage d'origine et vise 1600 px, un portrait est carré et n'a besoin
 * que de 512.
 *
 * Deux raisons de passer par le navigateur : une photo de téléphone part sinon à
 * plusieurs mégaoctets depuis une connexion mobile, et l'on veut que ce soit **le
 * cadrage voulu** qui parte, pas une image que le serveur rognera à l'aveugle.
 */

/** La grande taille servie. Au-delà, aucun écran n'en tire quoi que ce soit. */
const TARGET_SIZE = 512;
const WEBP_QUALITY = 0.82;

export interface PreparedPhoto {
  blob: Blob;
  fileName: string;
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
 * Recadre au carré depuis le centre, à 512 px de côté.
 *
 * Centre et non haut de l'image : sur une photo prise de loin, cadrer par le haut
 * donne un front et un plafond. Le centre attrape le visage dans la grande majorité
 * des cas, et le serveur applique de toute façon le même `cover` sur ses tailles.
 *
 * En cas d'échec du canvas (contexte indisponible, encodage refusé), le fichier
 * d'origine est rendu tel quel : le serveur sait le traiter, on perd le recadrage, pas
 * le dépôt.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const img = await loadImage(file);
  const fallback = { blob: file as Blob, fileName: file.name };

  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (side === 0) return fallback;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return fallback;

  context.drawImage(
    img,
    Math.round((img.naturalWidth - side) / 2),
    Math.round((img.naturalHeight - side) / 2),
    side,
    side,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE
  );

  const encoded = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
  );
  if (!encoded) return fallback;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return { blob: encoded, fileName: `${baseName}.webp` };
}
