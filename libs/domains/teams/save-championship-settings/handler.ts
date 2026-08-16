import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES } from '../shared/championship';
import { UnknownChampionshipError } from '../shared/errors';
import { SaveChampionshipSettingsRepository } from './repository';
import type { SaveChampionshipSettingsInput, SaveChampionshipSettingsOutput } from './dto';

const repo = new SaveChampionshipSettingsRepository();

/**
 * Réglages d'un championnat pour une saison : date de classement, lien du règlement.
 *
 * Les deux ne suivent pas la même logique, et la fonction ne les traite donc pas
 * ensemble :
 *
 * - **La date de référence** n'a de sens que pour un championnat qui arrête ses classements
 *   à date fixe. L'épingler sur un championnat qui les recalcule à chaque journée est
 *   refusé — un réglage que rien ne relira jamais est pire qu'un réglage absent, on finit
 *   par croire qu'il explique un calcul.
 * - **Le lien du règlement** vaut pour les quatre : chacun a le sien, et les joueurs
 *   doivent pouvoir le télécharger depuis la fiche de leur équipe.
 *
 * Les champs absents ne sont pas touchés : l'écran modifie l'un sans écraser l'autre.
 */
export async function saveChampionshipSettings(
  db: DbOrTx,
  input: SaveChampionshipSettingsInput,
  now: Date = new Date()
): Promise<SaveChampionshipSettingsOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const changesDate = input.referenceEloDate !== undefined;
  if (changesDate && input.referenceEloDate && rules.rankingPolicy !== 'season_fixed') {
    throw new UnknownChampionshipError(
      `${rules.label} arrête ses classements journée par journée : aucune date ne s'y épingle.`
    );
  }

  const existing = await repo.find(db, input.seasonCode, input.championship);

  const row = await repo.upsert(db, {
    seasonCode: input.seasonCode,
    championship: input.championship,
    referenceEloDate: changesDate ? input.referenceEloDate ?? null : existing?.referenceEloDate ?? null,
    rulesUrl: input.rulesUrl !== undefined ? input.rulesUrl : existing?.rulesUrl ?? null,
    rulesLabel: input.rulesLabel !== undefined ? input.rulesLabel : existing?.rulesLabel ?? null,
    updatedAt: now
  });

  return {
    championship: input.championship,
    referenceEloDate: row.referenceEloDate,
    rulesUrl: row.rulesUrl,
    rulesLabel: row.rulesLabel
  };
}
