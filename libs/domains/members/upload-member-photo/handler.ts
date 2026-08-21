import { type Db } from '@nba/db';
import {
  PHOTO_MAX_BYTES,
  PHOTO_SIZES,
  isAllowedPhotoType,
  photoHashOf,
  photoObjectKey,
  photoPrefix
} from '../shared/photo';
import { EmptyPhotoError, InvalidPhotoTypeError, PhotoTooLargeError } from '../shared/errors';
import { MemberPhotoRepository } from './repository';
import type { PhotoStore, PhotoTranscoder, UploadMemberPhotoInput, UploadMemberPhotoOutput } from './dto';

/** WebP à 82 : un visage de 512 px y tient en quelques dizaines de Ko sans bavure. */
const PHOTO_QUALITY = 82;
const PHOTO_FORMAT = 'image/webp';

/**
 * Dépose le portrait d'un adhérent.
 *
 * Le portrait est rattaché à la **licence**, pas à l'adhésion de l'année : il traverse
 * les réinscriptions (voir `member_profiles`). Un second dépôt remplace le premier —
 * pas d'historique, pas de déduplication contrairement à la médiathèque : une photo de
 * profil n'est pas une ressource partagée, et deux adhérents n'ont pas à se retrouver
 * sur le même objet parce qu'ils ont envoyé le même fichier.
 */
export async function uploadMemberPhoto(
  db: Db,
  store: PhotoStore,
  input: UploadMemberPhotoInput,
  /**
   * Absent, le fichier reçu est déposé tel quel en guise de grande taille.
   *
   * Le binding Images n'existe pas en développement local : refuser ici rendrait la
   * fonctionnalité intestable hors production, pour une optimisation manquante.
   */
  transcoder?: PhotoTranscoder,
  now: Date = new Date()
): Promise<UploadMemberPhotoOutput> {
  if (!isAllowedPhotoType(input.mimeType)) throw new InvalidPhotoTypeError();
  if (input.bytes.byteLength === 0) throw new EmptyPhotoError();
  if (input.bytes.byteLength > PHOTO_MAX_BYTES) throw new PhotoTooLargeError();

  const repo = new MemberPhotoRepository();
  const previous = await repo.findByLicence(db, input.licence);

  const prefix = photoPrefix(await photoHashOf(input.bytes));
  await storeSizes(store, transcoder, prefix, input);

  // Horodatage à la seconde : D1 stocke les dates en secondes, si bien qu'une valeur
  // à la milliseconde rendue ici ne serait pas celle que la fiche relira ensuite. Les
  // deux servent de version d'URL — les laisser diverger ferait charger deux fois la
  // même image.
  const stamp = new Date(Math.floor(now.getTime() / 1000) * 1000);
  await repo.savePhotoKey(db, input.licence, prefix, stamp);

  // L'ancien portrait ne sert plus personne : le laisser ferait grossir le bucket d'un
  // objet par changement de photo, sans que rien ne les rattrape jamais. Même préfixe
  // (le même fichier redéposé) : il n'y a rien à retirer, on vient de le réécrire.
  if (previous?.photoKey && previous.photoKey !== prefix) {
    await store.deletePrefix(previous.photoKey);
  }

  return { photoUpdatedAt: stamp.getTime() };
}

/**
 * Attendu dans la requête, jamais détaché : une promesse laissée en suspens est annulée
 * à la fin de la requête sur Workers, et l'on se retrouverait avec des tests verts et
 * une production sans vignette.
 */
async function storeSizes(
  store: PhotoStore,
  transcoder: PhotoTranscoder | undefined,
  prefix: string,
  input: UploadMemberPhotoInput
): Promise<void> {
  const [large, ...thumbnails] = PHOTO_SIZES;

  // La grande taille existe toujours : à défaut de transcodage, c'est le fichier reçu.
  const full = (await transcode(transcoder, input, large)) ?? {
    bytes: input.bytes,
    contentType: input.mimeType
  };
  await store.put(photoObjectKey(prefix, large), full.bytes, full.contentType);

  // Les vignettes sont une optimisation : la route de service retombe sur la grande
  // taille quand elles manquent, et un quota Images épuisé ne doit pas faire échouer un
  // dépôt dont le fichier est déjà en place.
  for (const size of thumbnails) {
    const small = await transcode(transcoder, input, size);
    if (small) await store.put(photoObjectKey(prefix, size), small.bytes, small.contentType);
  }
}

async function transcode(
  transcoder: PhotoTranscoder | undefined,
  input: UploadMemberPhotoInput,
  width: number
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  if (!transcoder) return null;
  try {
    // Le type réellement rendu est conservé, et non celui demandé : Cloudflare peut
    // livrer autre chose, et c'est cette valeur-là que R2 rendra au navigateur.
    const produced = await transcoder.resize(input.bytes, {
      width,
      format: PHOTO_FORMAT,
      quality: PHOTO_QUALITY
    });

    /*
      Zéro octet est un échec, pas un résultat.

      Vérifié en développement : une image de 2 px agrandie à 512 en `cover` revient
      avec un type MIME correct et un corps vide. Sans ce contrôle, l'objet vide part
      dans R2 et la fiche affiche une image cassée là où le repli sur l'original aurait
      donné un portrait — un échec silencieux, du genre qui ne se voit qu'en production.
    */
    if (produced.bytes.byteLength === 0) {
      console.warn(`[member-photo] taille ${width} rendue vide — repli sur l'original`);
      return null;
    }
    return produced;
  } catch (error) {
    console.error(`[member-photo] taille ${width} non produite`, error);
    return null;
  }
}
