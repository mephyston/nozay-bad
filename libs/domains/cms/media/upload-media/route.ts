import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { uploadMedia } from './handler';
import type { MediaStore, ImageTranscoder } from './dto';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket; IMAGES?: ImagesBinding };

export const uploadMediaRoute = new Hono<{ Bindings: Bindings }>();

/** Adaptateur R2, pour que le handler ignore tout de l'objet-store. */
function r2Store(bucket: R2Bucket): MediaStore {
  return {
    async has(key) {
      return (await bucket.head(key)) !== null;
    },
    async put(key, bytes, mimeType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    }
  };
}

/**
 * Adaptateur sur le binding Images, même intention que `r2Store`.
 *
 * Le transcodage a lieu **une fois, au dépôt**, et non à chaque requête : les
 * déclinaisons partent ensuite dans R2 sous cache immuable d'un an. C'est ce qui garde
 * la consommation à quelques transformations par image déposée, très en deçà des
 * 5 000 par mois de l'offre gratuite, là où une transformation à la volée les
 * épuiserait sur un seul passage de robot.
 */
export function imagesTranscoder(images: ImagesBinding): ImageTranscoder {
  return {
    async resize(bytes, { width, format, quality }) {
      // Un flux neuf à chaque appel : `input()` le consomme, et le réutiliser d'une
      // largeur à l'autre donnerait une image vide à partir de la deuxième.
      const result = await images
        .input(new Blob([bytes]).stream())
        .transform({ width })
        .output({ format: format as 'image/avif' | 'image/webp', quality });

      // `contentType()` et non `format` : le service ne rend pas toujours ce qu'on lui
      // demande, et c'est à l'appelant de s'en apercevoir (voir `TranscodedImage`).
      return {
        bytes: await new Response(result.image()).arrayBuffer(),
        contentType: result.contentType()
      };
    }
  };
}

uploadMediaRoute.post('/media', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ success: false, error: 'Aucun fichier reçu' }, 400);

  const toInt = (value: FormDataEntryValue | null) => {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  };

  const db = createDb(c.env.DB);
  const { media, cree } = await uploadMedia(
    db,
    r2Store(c.env.MEDIA),
    {
      bytes: await file.arrayBuffer(),
      mimeType: file.type,
      width: toInt(form.get('width')),
      height: toInt(form.get('height')),
      alt: (form.get('alt') as string) ?? '',
      title: (form.get('title') as string) ?? undefined
    },
    // Binding absent : le dépôt se fait quand même, sans déclinaison. Refuser ici
    // rendrait la médiathèque inutilisable pour une optimisation manquante.
    //
    // `c.env?.` et non `c.env.` : c'est cette forme-là que reconnaît
    // `scripts/check-env-declarations.js`, qui vérifie que tout binding utilisé est
    // bien déclaré. Écrit sans le `?.`, le binding échapperait à la vérification.
    c.env?.IMAGES ? imagesTranscoder(c.env.IMAGES) : undefined
  );

  /*
    `cree` voyage dans le corps et non dans le seul code de retour : l'administration
    passe par un relais, et une enveloppe se transmet plus sûrement qu'un statut. Le 201
    reste posé parce que c'est ce que HTTP dit d'une création.
  */
  return c.json({ success: true, data: media, cree }, cree ? 201 : 200);
});
