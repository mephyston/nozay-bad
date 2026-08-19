import { type Db, AppError } from '@nba/db';
import { DeleteMediaRepository } from './repository';
import type { DeleteMediaInput, DeleteMediaOutput } from './dto';

/**
 * Retire un média du catalogue.
 *
 * Les objets R2 ne sont **pas** effacés : leur clé porte l'empreinte du contenu, donc
 * réimporter le même fichier retombe dessus, et un objet orphelin coûte quelques
 * kilo-octets là où une suppression trop zélée casserait une page déjà en ligne dont
 * le cache pointe encore l'ancienne URL. Le ménage se fait à part, si besoin.
 */
export async function deleteMedia(db: Db, input: DeleteMediaInput): Promise<DeleteMediaOutput> {
  const repo = new DeleteMediaRepository();

  const media = await repo.findById(db, input.mediaId);
  if (!media) throw new AppError('Média introuvable', 404);

  if ((await repo.countDirectReferences(db, media.id)) > 0) {
    throw new AppError(
      "Ce média est utilisé comme image d'une page ou d'un article. Retirez-le d'abord.",
      409
    );
  }

  await db.batch(repo.buildDeleteStatements(db, media.id) as never);
  return { deleted: true };
}
