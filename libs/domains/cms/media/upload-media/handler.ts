import { type Db, AppError } from '@nba/db';
import { contentHashOf, isAllowedMediaType, originalKey } from '../../shared/media';
import { UploadMediaRepository } from './repository';
import type { UploadMediaInput, UploadMediaOutput, MediaStore } from './dto';

/** 12 Mio : au-delà, c'est une photo non redimensionnée, pas un média de site. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Dépose un média et l'enregistre.
 *
 * Déduplication par empreinte de contenu : redéposer la même image renvoie la ligne
 * existante au lieu d'en créer une seconde. C'est ce qui rend l'import rejouable, et
 * ça évite la médiathèque encombrée de doublons qu'on trouve sur l'ancien site.
 */
export async function uploadMedia(
  db: Db,
  store: MediaStore,
  input: UploadMediaInput,
  now: Date = new Date()
): Promise<UploadMediaOutput> {
  if (!isAllowedMediaType(input.mimeType)) {
    // Le SVG est refusé avec le reste : c'est un document exécutable, qui peut porter
    // du script. L'assainir coûterait plus cher que de s'en passer.
    throw new AppError(`Type de fichier non accepté : ${input.mimeType}`, 415);
  }
  if (input.bytes.byteLength === 0) throw new AppError('Fichier vide', 400);
  if (input.bytes.byteLength > MAX_BYTES) {
    throw new AppError('Fichier trop volumineux : 12 Mo maximum.', 413);
  }

  const isImage = input.mimeType.startsWith('image/');
  if (isImage && (!input.width || !input.height)) {
    // Sans dimensions, le rendu ne peut pas réserver la place de l'image et la page
    // se décale au chargement. On refuse plutôt que de livrer ce défaut.
    throw new AppError("Dimensions de l'image manquantes.", 400);
  }

  const repo = new UploadMediaRepository();
  const contentHash = await contentHashOf(input.bytes);

  const existing = await repo.findByHash(db, contentHash);
  if (existing) return existing;

  const key = originalKey(contentHash, input.mimeType);
  if (!(await store.has(key))) await store.put(key, input.bytes, input.mimeType);

  return repo.insert(db, {
    key,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    width: input.width ?? null,
    height: input.height ?? null,
    alt: input.alt ?? '',
    title: input.title ?? null,
    credit: null,
    contentHash,
    legacyWpId: null,
    createdAt: now
  });
}
