import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { UnknownChampionshipError } from '../shared/errors';
import { PublishRostersRepository } from './repository';
import type { PublishRostersInput, PublishRostersOutput } from './dto';

const repo = new PublishRostersRepository();

/**
 * Publie, ou retire, les effectifs d'un championnat pour une saison.
 *
 * Le coach compose ses équipes par essais : effectifs saisis à la main, répartition de
 * l'outil d'équilibrage, désignation des capitaines. Tant que rien n'est publié,
 * l'espace adhérent n'en montre rien et personne n'y compose. Une fois publiés, les
 * retouches se voient aussitôt ; les retirer rend la main aux essais.
 *
 * Aucune notification : publier n'annonce rien de daté, chacun découvre son équipe en
 * ouvrant l'application. Ce sont les compositions de rencontre qui préviennent.
 */
export async function publishRosters(
  db: DbOrTx,
  input: PublishRostersInput,
  now: Date = new Date()
): Promise<PublishRostersOutput> {
  if (!CHAMPIONSHIP_RULES[input.championship]) throw new UnknownChampionshipError();

  const row = await repo.setPublishedAt(db, input.seasonCode, input.championship, input.published ? now : null, now);
  return {
    championship: input.championship,
    rostersPublishedAt: row.rostersPublishedAt ? row.rostersPublishedAt.toISOString() : null
  };
}
