import { type Db } from '@nba/db';
import { ClubFeaturesRepository, getClubFeatures } from '../shared/repository';
import type { Feature, FeatureState } from '../shared/features';

export async function updateClubFeatures(
  db: Db,
  changes: Partial<Record<Feature, boolean>>,
  actorEmail: string,
  now: Date = new Date()
): Promise<FeatureState> {
  await new ClubFeaturesRepository().setMany(db, changes, actorEmail, now);
  // Relecture : l'appelant reçoit l'état **effectif**, préalables appliqués — éteindre
  // « notifications » éteint les rappels, et l'écran doit le montrer tout de suite.
  return getClubFeatures(db);
}
