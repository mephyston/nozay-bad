import { type Db, AppError } from '@nba/db';
import { eq } from 'drizzle-orm';
import { productsTable } from '../shared/schema';
import { ProductNotFoundError, VariantImageError } from '../shared/errors';
import {
  PRODUCT_IMAGE_FORMAT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_QUALITY,
  PRODUCT_IMAGE_WIDTH,
  contentHashOf,
  productImageKey,
  sniffImageType,
  type ProductImageStore,
  type ProductImageTranscoder
} from '../shared/images';

/**
 * Dépose l'image d'un produit et enregistre sa clé.
 *
 * Réduite au dépôt à la largeur d'une carte, en WebP. Sans binding Images — en
 * développement — le fichier reçu est déposé tel quel : la fonctionnalité reste
 * testable hors production, pour une optimisation manquante.
 *
 * L'image vit sur le produit, jamais sur une déclinaison : c'est le parent que la
 * vitrine affiche, et ses tailles n'ont pas de photo à elles.
 */
export async function uploadProductImage(
  db: Db,
  store: ProductImageStore,
  productId: number,
  bytes: ArrayBuffer,
  transcoder?: ProductImageTranscoder
): Promise<{ imageKey: string }> {
  const product = await db.select({ id: productsTable.id, parentId: productsTable.parentId }).from(productsTable).where(eq(productsTable.id, productId)).get();
  if (!product) throw new ProductNotFoundError();
  if (product.parentId !== null) throw new VariantImageError();

  if (bytes.byteLength === 0) throw new AppError('Fichier vide', 400);
  if (bytes.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
    throw new AppError(`Image trop lourde : ${Math.round(PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024)} Mo au plus.`, 400);
  }
  const mimeType = sniffImageType(bytes);
  if (!mimeType) throw new AppError('Format non reconnu : PNG, JPEG ou WebP attendu.', 400);

  // L'empreinte est celle du fichier reçu : redéposer la même photo retrouve la même
  // clé, réduite ou non, sans passer par le binding une seconde fois.
  const hash = await contentHashOf(bytes);
  const reduced = await reduce(transcoder, bytes);
  const key = reduced
    ? productImageKey(hash, reduced.contentType, PRODUCT_IMAGE_WIDTH)
    : productImageKey(hash, mimeType);
  if (!(await store.has(key))) {
    await store.put(key, reduced?.bytes ?? bytes, reduced?.contentType ?? mimeType);
  }

  await db.update(productsTable).set({ imageKey: key }).where(eq(productsTable.id, productId)).run();
  return { imageKey: key };
}

/**
 * Retire l'image : la carte s'affichera sans.
 *
 * L'objet R2 reste — il est adressé par son contenu, un autre produit peut le
 * partager, et un retrait fait par erreur se remet en place sans le renvoyer.
 */
export async function removeProductImage(db: Db, productId: number): Promise<void> {
  const updated = await db.update(productsTable).set({ imageKey: null }).where(eq(productsTable.id, productId)).returning({ id: productsTable.id }).get();
  if (!updated) throw new ProductNotFoundError();
}

async function reduce(
  transcoder: ProductImageTranscoder | undefined,
  bytes: ArrayBuffer
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  if (!transcoder) return null;
  try {
    const produced = await transcoder.resize(bytes, {
      width: PRODUCT_IMAGE_WIDTH,
      format: PRODUCT_IMAGE_FORMAT,
      quality: PRODUCT_IMAGE_QUALITY
    });
    // Zéro octet est un échec, pas un résultat : le binding peut rendre un corps vide
    // avec un type correct. Sans ce contrôle, l'objet vide part dans R2 et la carte
    // affiche une image cassée là où l'original aurait suffi.
    if (produced.bytes.byteLength === 0) return null;
    return produced;
  } catch (error) {
    console.warn('[shop] réduction de l’image impossible, original déposé', error);
    return null;
  }
}
