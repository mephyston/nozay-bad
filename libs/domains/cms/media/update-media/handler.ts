import { type Db, AppError } from '@nba/db';
import { bumpContentVersion } from '../../shared/cache-version';
import { UpdateMediaRepository } from './repository';
import type { UpdateMediaInput, UpdateMediaOutput } from './dto';

/**
 * Corrige le texte alternatif d'un média.
 *
 * Ce texte porte deux rôles à la fois, et c'est ce qui justifie de pouvoir le reprendre
 * après coup : il est lu par les lecteurs d'écran sur le site public, et c'est **le
 * seul libellé** sous lequel un média se retrouve dans la médiathèque — la recherche
 * n'a que lui et la clé R2, qui n'est qu'une empreinte. Un fichier déposé sans
 * description, ou décrit à la hâte, restait introuvable pour toujours.
 *
 * Le fichier lui-même n'est jamais touché : sa clé porte l'empreinte de son contenu.
 */
export async function updateMedia(
  db: Db,
  input: UpdateMediaInput,
  now: Date = new Date()
): Promise<UpdateMediaOutput> {
  const repo = new UpdateMediaRepository();

  const media = await repo.findById(db, input.mediaId);
  if (!media) throw new AppError('Média introuvable', 404);

  const alt = input.alt.trim();
  await repo.updateAlt(db, media.id, alt);

  // Le texte alternatif est rendu dans les pages qui affichent le média : sans cette
  // incrémentation, la correction resterait invisible une heure derrière le cache du
  // site public — le temps qu'il faut pour conclure qu'elle n'a pas été enregistrée.
  await bumpContentVersion(db, now);

  return { ...media, alt };
}
