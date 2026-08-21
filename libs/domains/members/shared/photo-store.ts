import type { PhotoStore, PhotoTranscoder } from '../upload-member-photo/dto';

/**
 * Adaptateurs R2 et Images des portraits, pour que les handlers ignorent tout de
 * l'infrastructure. Partagés par les tranches dépôt et suppression, qui écrivent au même
 * endroit — les dupliquer ferait diverger la façon d'effacer un préfixe.
 */
export function r2PhotoStore(bucket: R2Bucket): PhotoStore {
  return {
    async put(key, bytes, mimeType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    },
    async deletePrefix(prefix) {
      // Le préfixe porte deux ou trois objets (une taille chacun) : une seule page de
      // listage suffit, et `delete` accepte le lot.
      const listed = await bucket.list({ prefix: `${prefix}/` });
      if (listed.objects.length === 0) return;
      await bucket.delete(listed.objects.map((object) => object.key));
    }
  };
}

/**
 * Transcodage au dépôt, jamais à la volée : deux transformations par portrait déposé,
 * là où une transformation par affichage épuiserait les 5 000 mensuelles de l'offre
 * gratuite sur un seul passage dans un effectif.
 */
export function photoTranscoder(images: ImagesBinding): PhotoTranscoder {
  return {
    async resize(bytes, { width, format, quality }) {
      // Un flux neuf à chaque appel : `input()` le consomme, et le réutiliser d'une
      // taille à l'autre donnerait une image vide à partir de la deuxième.
      const result = await images
        .input(new Blob([bytes]).stream())
        .transform({ width, height: width, fit: 'cover' })
        .output({ format: format as 'image/webp', quality });

      return {
        bytes: await new Response(result.image()).arrayBuffer(),
        contentType: result.contentType()
      };
    }
  };
}
