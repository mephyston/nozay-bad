import { type Db } from '@nba/db';
import { GetSiteSettingsRepository } from './repository';
import type { GetSiteSettingsOutput } from './dto';

/**
 * Valeurs servies quand la ligne manque.
 *
 * La migration la sème, mais une base montée autrement — un environnement neuf, un
 * jeu de test — ne doit pas faire échouer le rendu du pied de page. Vides : le site
 * d'un club ne montre jamais la phrase ni l'adresse d'un autre.
 */
export const SITE_SETTINGS_DEFAULTS: GetSiteSettingsOutput = {
  footerDescription: '',
  footerAddress: '',
  instagramUrl: null,
  facebookUrl: null
};

/** Une chaîne vide en base vaut « non renseigné » : un lien vide serait un lien mort. */
function orNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export async function getSiteSettings(db: Db): Promise<GetSiteSettingsOutput> {
  const row = await new GetSiteSettingsRepository().find(db);
  if (!row) return SITE_SETTINGS_DEFAULTS;

  return {
    footerDescription: row.footerDescription,
    footerAddress: row.footerAddress,
    instagramUrl: orNull(row.instagramUrl),
    facebookUrl: orNull(row.facebookUrl)
  };
}
