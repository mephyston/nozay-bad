/**
 * Une photo de chèque réduite avant l'envoi au modèle de lecture.
 *
 * Un téléphone livre 3 à 4 Mo et 4 000 pixels de large ; le modèle n'en lit pas plus
 * qu'à 1 600, et l'image passait jusqu'ici entière dans le corps de la requête puis dans
 * l'appel au modèle. Le plus grand côté est ramené à `MAX_EDGE`, en JPEG.
 *
 * L'orientation EXIF est appliquée par le navigateur au décodage (`createImageBitmap`
 * avec `imageOrientation: 'from-image'`) : une photo prise en portrait ne part plus
 * couchée. Sans canevas — un environnement de test, un navigateur qui refuse —, le
 * fichier repart tel quel : réduire est une économie, pas une condition.
 */
export const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
