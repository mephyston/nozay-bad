import { type Db } from '@nba/db';
import { DEFAULT_PHOTO_SIZE, photoObjectKey } from '../shared/photo';
import { PhotoNotFoundError } from '../shared/errors';
import { MemberPhotoRepository } from '../upload-member-photo/repository';
import type { GetMemberPhotoInput, GetMemberPhotoOutput } from './dto';

/**
 * Résout les clés R2 du portrait d'un adhérent.
 *
 * Le handler ne lit aucun octet : la lecture de l'objet et la construction de la réponse
 * appartiennent à la route, qui seule sait streamer. Ici, on ne fait que traduire une
 * licence en clés d'objet — ce qui rend la règle de repli testable sans R2.
 */
export async function getMemberPhoto(db: Db, input: GetMemberPhotoInput): Promise<GetMemberPhotoOutput> {
  const profile = await new MemberPhotoRepository().findByLicence(db, input.licence);
  if (!profile?.photoKey) throw new PhotoNotFoundError();

  const keys = [photoObjectKey(profile.photoKey, input.size)];
  if (input.size !== DEFAULT_PHOTO_SIZE) {
    keys.push(photoObjectKey(profile.photoKey, DEFAULT_PHOTO_SIZE));
  }

  return { keys, photoUpdatedAt: profile.photoUpdatedAt?.getTime() ?? null };
}
