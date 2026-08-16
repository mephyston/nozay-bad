import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIPS, CHAMPIONSHIP_RULES } from '../shared/championship';
import { ListChampionshipSettingsRepository } from './repository';
import type { ListChampionshipSettingsOutput } from './dto';

const repo = new ListChampionshipSettingsRepository();

/**
 * Dates de classement de référence, un championnat par ligne.
 *
 * La liste est construite à partir du **règlement**, pas de la base : les quatre
 * championnats existent toujours, même si aucune date n'a encore été épinglée. Une ligne
 * absente est donc une date à choisir, pas un championnat qui n'existe pas — et l'écran
 * peut la présenter comme telle.
 */
export async function listChampionshipSettings(
  db: DbOrTx,
  seasonCode: string
): Promise<ListChampionshipSettingsOutput> {
  const stored = await repo.listBySeason(db, seasonCode);
  const byChampionship = new Map(stored.map((row) => [row.championship, row]));

  return {
    seasonCode,
    items: CHAMPIONSHIPS.map((championship) => {
      const rules = CHAMPIONSHIP_RULES[championship];
      return {
        championship,
        label: rules.label,
        rankingPolicy: rules.rankingPolicy,
        // Un championnat régional recalcule sa référence à chaque journée : rien à
        // épingler, et afficher une date figée y serait trompeur.
        referenceEloDate:
          rules.rankingPolicy === 'season_fixed'
            ? byChampionship.get(championship)?.referenceEloDate ?? null
            : null,
        // Le règlement existe pour les quatre : il ne dépend d'aucune politique de date.
        rulesUrl: byChampionship.get(championship)?.rulesUrl ?? null,
        rulesLabel: byChampionship.get(championship)?.rulesLabel ?? null
      };
    })
  };
}
