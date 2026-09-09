import { OPEN_PLAY_FLAG, featureFlag, isFlagEnabled, isUnderPrefix } from './feature-flags';

/**
 * Drapeau de la fonctionnalité « jeu libre ».
 *
 * La mécanique vit dans `feature-flags.ts`, partagée avec les séances individuelles ;
 * ce fichier ne garde que le nom du drapeau et les deux prédicats que ses tests et le
 * cron lisent.
 */

export type OpenPlayFlagEnv = {
  OPEN_PLAY_ENABLED?: string;
};

export function isOpenPlayEnabled(env: OpenPlayFlagEnv | undefined | null): boolean {
  return isFlagEnabled(env as Record<string, unknown> | undefined | null, OPEN_PLAY_FLAG.flag);
}

export function isOpenPlayPath(path: string): boolean {
  return isUnderPrefix(path, OPEN_PLAY_FLAG.prefix);
}

export function openPlayFeatureFlag() {
  return featureFlag(OPEN_PLAY_FLAG);
}
