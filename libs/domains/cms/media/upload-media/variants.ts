import { VARIANT_WIDTHS, VARIANT_FORMATS, variantKey } from '../../shared/media';
import type { ImageTranscoder, MediaStore } from './dto';
import type { CmsMediaVariantRow } from '../../shared/schema';

/**
 * Produit l'échelle de déclinaisons d'une image et la dépose dans l'objet-store.
 *
 * Rend les lignes à insérer dans `cms_media_variants` ; c'est l'appelant qui écrit,
 * pour que le dépôt et l'enregistrement restent séparés.
 *
 * Qualités reprises de la reprise WordPress (`scripts/wp-import/media.mjs`) : les deux
 * chemins doivent produire des fichiers comparables, sinon une même photo pèse deux
 * poids différents selon qu'elle est arrivée par l'import ou par la médiathèque.
 */
const QUALITY: Record<string, number> = { avif: 50, webp: 75 };

type VariantInsert = Omit<CmsMediaVariantRow, 'id'>;

export interface BuildVariantsInput {
  mediaId: number;
  contentHash: string;
  bytes: ArrayBuffer;
  /** Dimensions de l'original, déjà mesurées par le client et validées en amont. */
  width: number;
  height: number;
}

/**
 * Ne lève jamais.
 *
 * Une déclinaison est une optimisation, pas une condition du dépôt : un quota Images
 * épuisé, un format que le binding refuse ou une panne passagère ne doivent pas faire
 * échouer l'envoi et laisser l'utilisateur recommencer — le fichier, lui, est déjà en
 * place. On rend ce qui a abouti, et l'image est servie en original en attendant.
 * Redéposer le même fichier retentera la production (voir `uploadMedia`).
 */
export async function buildVariants(
  transcoder: ImageTranscoder,
  store: MediaStore,
  input: BuildVariantsInput
): Promise<VariantInsert[]> {
  // Jamais d'agrandissement : produire un 1600 depuis un 800 ajoute du poids sans
  // ajouter de détail. Même règle qu'à l'import, pour que les deux échelles coïncident.
  const widths = VARIANT_WIDTHS.filter((width) => width <= input.width);

  const produced = await Promise.all(
    widths.flatMap((width) =>
      VARIANT_FORMATS.map(async (format): Promise<VariantInsert | null> => {
        try {
          const requested = `image/${format}`;
          const { bytes, contentType } = await transcoder.resize(input.bytes, {
            width,
            format: requested,
            quality: QUALITY[format]
          });

          /*
            Format rendu différent du format demandé : on jette.

            Cloudflare retombe silencieusement sur le WebP quand l'AVIF lui coûte trop
            cher. Enregistrer ces octets sous la clé `.avif` demandée les ferait
            annoncer en `<source type="image/avif">`, et le navigateur qui choisirait
            cette source échouerait à les décoder. Les enregistrer sous leur vrai nom ne
            vaut pas mieux : ils entreraient en collision avec le barreau WebP de la
            même largeur, produit à côté, et l'un écraserait l'autre dans R2.

            Renoncer laisse simplement l'échelle AVIF s'arrêter plus tôt que l'échelle
            WebP. C'est sans conséquence : chaque `<source>` porte son propre `srcset`,
            et le navigateur choisit au mieux dans celui qu'il retient.
          */
          if (contentType !== requested) {
            console.warn(`[media] ${width}px : ${requested} demandé, ${contentType} rendu — variante ignorée`);
            return null;
          }

          const key = variantKey(input.contentHash, width, format);
          await store.put(key, bytes, requested);
          return {
            mediaId: input.mediaId,
            format,
            width,
            // Déduite du ratio de l'original : le binding conserve les proportions, et
            // l'interroger pour une valeur qu'on sait déjà coûterait une requête de plus.
            height: Math.round((input.height / input.width) * width),
            sizeBytes: bytes.byteLength,
            key
          };
        } catch (error) {
          console.error(`[media] variante ${width}.${format} non produite`, error);
          return null;
        }
      })
    )
  );

  return produced.filter((row): row is VariantInsert => row !== null);
}
