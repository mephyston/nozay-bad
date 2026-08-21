import { type Db } from '@nba/db';
import { MemberPhotoRepository } from '../upload-member-photo/repository';
import type { PhotoStore } from '../upload-member-photo/dto';

export interface DeleteMemberPhotoInput {
  licence: string;
}

export interface DeleteMemberPhotoOutput {
  deleted: boolean;
}

/**
 * Retire le portrait d'un adhérent, objets R2 compris.
 *
 * Contrairement à la médiathèque, qui conserve ses objets parce qu'une page en ligne
 * peut encore les pointer, un portrait n'est référencé que par cette ligne : le garder
 * reviendrait à conserver une donnée personnelle qu'on vient de nous demander
 * d'effacer. La ligne `member_profiles`, elle, subsiste — elle portera d'autres champs.
 *
 * Idempotent : effacer une photo déjà absente n'est pas une erreur, c'est le résultat
 * attendu. Deux onglets ouverts sur la même fiche ne doivent pas produire de 404.
 */
export async function deleteMemberPhoto(
  db: Db,
  store: PhotoStore,
  input: DeleteMemberPhotoInput,
  now: Date = new Date()
): Promise<DeleteMemberPhotoOutput> {
  const repo = new MemberPhotoRepository();
  const profile = await repo.findByLicence(db, input.licence);
  if (!profile?.photoKey) return { deleted: false };

  await repo.savePhotoKey(db, input.licence, null, now);
  await store.deletePrefix(profile.photoKey);

  return { deleted: true };
}
