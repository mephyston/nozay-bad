import { type Db } from '@nba/db';
import { SaveOpenPlayOpenerRepository } from './repository';
import type { SaveOpenPlayOpenerInput, SaveOpenPlayOpenerOutput } from './dto';

/**
 * Confie un badge à un adhérent, pour la saison.
 *
 * Le domaine ne vérifie pas que la licence existe : il est feuille, il ne connaît pas les
 * adhérents. C'est l'écran du bureau qui choisit dans l'annuaire — et une licence saisie
 * à la main mais inconnue se verra, puisqu'aucun nom ne s'affichera en face.
 *
 * Idempotent : désigner deux fois la même personne n'est pas une erreur.
 */
export async function saveOpenPlayOpener(
  db: Db,
  input: SaveOpenPlayOpenerInput,
  now: Date = new Date()
): Promise<SaveOpenPlayOpenerOutput> {
  const repo = new SaveOpenPlayOpenerRepository();
  return repo.upsert(db, input.seasonCode, input.licence.trim(), now);
}
