import { type Db } from '@nba/db';
import { isSafeHref } from '@nba/html';
import { CmsSocialUrlError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { getSiteSettings } from '../get-site-settings/handler';
import { SaveSiteSettingsRepository } from './repository';
import type { SaveSiteSettingsInput, SaveSiteSettingsOutput } from './dto';

/** Vide après nettoyage = non renseigné. On range `null`, jamais `''`. */
function normaliseUrl(value: string | null | undefined, network: string): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') return null;
  // Même garde que pour une adresse extérieure de menu : `javascript:` dans le pied de
  // page d'un site public serait une injection sur toutes les pages à la fois.
  if (!isSafeHref(trimmed)) throw new CmsSocialUrlError(network);
  return trimmed;
}

/**
 * Enregistre les réglages du site.
 *
 * L'écriture incrémente la version de contenu : ces valeurs sont rendues sur **toutes**
 * les pages, donc présentes dans toutes les entrées du cache du bord. Sans cet
 * incrément, une correction d'adresse resterait invisible jusqu'à expiration — une
 * heure — et la modification passerait pour perdue.
 */
export async function saveSiteSettings(
  db: Db,
  input: SaveSiteSettingsInput,
  now: Date = new Date()
): Promise<SaveSiteSettingsOutput> {
  const values = {
    footerDescription: input.footerDescription.trim(),
    footerAddress: input.footerAddress.trim(),
    instagramUrl: normaliseUrl(input.instagramUrl, 'Instagram'),
    facebookUrl: normaliseUrl(input.facebookUrl, 'Facebook'),
    updatedByEmail: input.actorEmail,
    updatedAt: now
  };

  await new SaveSiteSettingsRepository().upsert(db, values);
  await bumpContentVersion(db, now);

  // Relecture plutôt que renvoi des valeurs écrites : l'appelant reçoit exactement ce
  // que le site servira, y compris le repli sur les valeurs par défaut.
  return getSiteSettings(db);
}
