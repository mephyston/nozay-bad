import { AppError, type Db } from '@nba/db';
import { ClubSettingsRepository, getClubSettings } from '../shared/repository';
import { type ClubAsset, type ClubSettings } from '../shared/settings';
import {
  MAX_CLUB_ASSET_BYTES,
  clubAssetKey,
  contentHashOf,
  sniffImageType,
  type ClubAssetStore
} from '../shared/assets';

export const MAX_PARTNER_LOGOS = 6;

async function storeImage(store: ClubAssetStore, name: string, bytes: ArrayBuffer): Promise<string> {
  if (bytes.byteLength === 0) throw new AppError('Fichier vide', 400);
  if (bytes.byteLength > MAX_CLUB_ASSET_BYTES) {
    throw new AppError(`Image trop lourde : ${Math.round(MAX_CLUB_ASSET_BYTES / 1024 / 1024)} Mo au plus.`, 400);
  }
  const mimeType = sniffImageType(bytes);
  if (!mimeType) throw new AppError('Format non reconnu : PNG ou JPEG attendu.', 400);

  const key = clubAssetKey(await contentHashOf(bytes), name, mimeType);
  // Adressé par le contenu : redéposer la même image ne réécrit rien.
  if (!(await store.has(key))) await store.put(key, bytes, mimeType);
  return key;
}

/** Dépose une image du club et enregistre sa clé. Le PDF suivant la verra. */
export async function uploadClubAsset(
  db: Db,
  store: ClubAssetStore,
  asset: ClubAsset,
  bytes: ArrayBuffer,
  actorEmail: string,
  now: Date = new Date()
): Promise<ClubSettings> {
  const key = await storeImage(store, asset, bytes);
  await new ClubSettingsRepository().updateAssetKey(db, asset, key, actorEmail, now);
  return getClubSettings(db);
}

/**
 * Retire une image : le document s'imprimera sans.
 *
 * L'objet R2 reste — il est adressé par son contenu, une autre clé peut le
 * partager, et un dépôt annulé par erreur se remet en place sans le renvoyer.
 */
export async function removeClubAsset(db: Db, asset: ClubAsset, actorEmail: string, now: Date = new Date()): Promise<ClubSettings> {
  await new ClubSettingsRepository().updateAssetKey(db, asset, null, actorEmail, now);
  return getClubSettings(db);
}

export async function addPartnerLogo(
  db: Db,
  store: ClubAssetStore,
  bytes: ArrayBuffer,
  actorEmail: string,
  now: Date = new Date()
): Promise<ClubSettings> {
  const current = await getClubSettings(db);
  if (current.partnerLogoKeys.length >= MAX_PARTNER_LOGOS) {
    throw new AppError(`${MAX_PARTNER_LOGOS} logos partenaires au plus : le bas de page n'en tient pas davantage.`, 400);
  }
  const key = await storeImage(store, `partner-${current.partnerLogoKeys.length + 1}`, bytes);
  const keys = current.partnerLogoKeys.includes(key) ? current.partnerLogoKeys : [...current.partnerLogoKeys, key];
  await new ClubSettingsRepository().updatePartnerLogoKeys(db, keys, actorEmail, now);
  return getClubSettings(db);
}

/** Réordonne ou retire des logos partenaires : la liste reçue remplace l'ancienne, mais ne peut rien y ajouter. */
export async function setPartnerLogos(
  db: Db,
  keys: string[],
  actorEmail: string,
  now: Date = new Date()
): Promise<ClubSettings> {
  const current = await getClubSettings(db);
  const known = new Set(current.partnerLogoKeys);
  const kept = keys.filter((k, i) => known.has(k) && keys.indexOf(k) === i);
  await new ClubSettingsRepository().updatePartnerLogoKeys(db, kept, actorEmail, now);
  return getClubSettings(db);
}
