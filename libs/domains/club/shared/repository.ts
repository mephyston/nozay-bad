import { eq, inArray, sql } from 'drizzle-orm';
import { type Db, type DbOrTx } from '@nba/db';
import { clubFeaturesTable, clubSettingsTable, type ClubSettingsRow } from './schema';
import {
  CLUB_ASSET_COLUMNS,
  NEUTRAL_CLUB_SETTINGS,
  SETTINGS_SECTIONS,
  settingsFromRow,
  type ClubAsset,
  type ClubSettings,
  type SectionValues,
  type SettingsSection
} from './settings';
import { effectiveFeatures, isFeature, type Feature, type FeatureState } from './features';

/** Identifiant de la ligne unique, comme `cms_site_settings` et `attestation_config`. */
export const CLUB_SETTINGS_ID = 1;

/**
 * Lecture mémoïsée par base.
 *
 * Une requête d'API ouvre sa propre instance drizzle (`createDb(c.env.DB)`) : la
 * mémoïser revient à mémoïser par requête. Une facture lit l'identité du club pour
 * son en-tête, ses mentions légales et son IBAN ; sans ce cache, chaque lecteur
 * relirait la ligne, et un rapport de plusieurs PDF la lirait autant de fois.
 */
const cache = new WeakMap<object, Promise<ClubSettings>>();

export async function getClubSettings(db: DbOrTx): Promise<ClubSettings> {
  let pending = cache.get(db);
  if (!pending) {
    pending = readSettings(db);
    cache.set(db, pending);
  }
  return pending;
}

/** Vide la mémoïsation d'une base : après une écriture, la relecture doit voir la base. */
export function forgetClubSettings(db: DbOrTx): void {
  cache.delete(db);
}

async function readSettings(db: DbOrTx): Promise<ClubSettings> {
  const row = await new ClubSettingsRepository().find(db);
  // Ligne absente : un club neutre plutôt qu'une erreur. Une base montée sans la
  // migration — un test, un environnement neuf — garde des pages qui se rendent ;
  // c'est le test d'architecture qui garantit qu'aucun club réel n'est écrit ici.
  return row ? settingsFromRow(row) : NEUTRAL_CLUB_SETTINGS;
}

export class ClubSettingsRepository {
  find(db: DbOrTx): Promise<ClubSettingsRow | undefined> {
    return db.select().from(clubSettingsTable).where(eq(clubSettingsTable.id, CLUB_SETTINGS_ID)).get();
  }

  /**
   * Écrit une section, et elle seule.
   *
   * `UPDATE` et non upsert : la ligne existe (semée par la migration) et une section
   * ne connaît pas les colonnes obligatoires des autres. Une base sans ligne renvoie
   * zéro ligne touchée, et l'appelant le dit — plutôt que d'avaler l'écriture.
   */
  async updateSection<S extends SettingsSection>(
    db: DbOrTx,
    section: S,
    values: SectionValues<S>,
    actorEmail: string,
    now: Date
  ): Promise<boolean> {
    // Seules les colonnes de la section passent : un champ d'une autre section glissé
    // dans le corps serait une écriture hors de la garde de son écran.
    const allowed = SETTINGS_SECTIONS[section] as readonly string[];
    const set: Record<string, unknown> = { updatedByEmail: actorEmail, updatedAt: now };
    for (const key of allowed) set[key] = (values as Record<string, unknown>)[key];

    const result = await db
      .update(clubSettingsTable)
      .set(set)
      .where(eq(clubSettingsTable.id, CLUB_SETTINGS_ID))
      .run();
    forgetClubSettings(db);
    return result.meta.changes > 0;
  }

  async updateAssetKey(db: DbOrTx, asset: ClubAsset, key: string | null, actorEmail: string, now: Date): Promise<boolean> {
    const result = await db
      .update(clubSettingsTable)
      .set({ [CLUB_ASSET_COLUMNS[asset]]: key, updatedByEmail: actorEmail, updatedAt: now })
      .where(eq(clubSettingsTable.id, CLUB_SETTINGS_ID))
      .run();
    forgetClubSettings(db);
    return result.meta.changes > 0;
  }

  async updatePartnerLogoKeys(db: DbOrTx, keys: string[], actorEmail: string, now: Date): Promise<boolean> {
    const result = await db
      .update(clubSettingsTable)
      .set({ partnerLogoKeys: JSON.stringify(keys), updatedByEmail: actorEmail, updatedAt: now })
      .where(eq(clubSettingsTable.id, CLUB_SETTINGS_ID))
      .run();
    forgetClubSettings(db);
    return result.meta.changes > 0;
  }
}

const featuresCache = new WeakMap<object, Promise<FeatureState>>();

/**
 * L'état effectif des fonctionnalités, mémoïsé par base comme l'identité.
 *
 * Lu par le middleware de l'API sur chaque requête : sans mémoïsation, une page
 * d'administration qui enchaîne dix lectures relirait dix fois la table.
 */
export async function getClubFeatures(db: DbOrTx): Promise<FeatureState> {
  let pending = featuresCache.get(db);
  if (!pending) {
    pending = readFeatures(db);
    featuresCache.set(db, pending);
  }
  return pending;
}

export function forgetClubFeatures(db: DbOrTx): void {
  featuresCache.delete(db);
}

async function readFeatures(db: DbOrTx): Promise<FeatureState> {
  const [rows, treasury] = await Promise.all([db.select().from(clubFeaturesTable).all(), listTreasuryAccounts(db)]);
  const stored: Partial<Record<Feature, boolean>> = {};
  for (const row of rows) {
    // Une clé sortie du catalogue reste en base sans effet : la retirer serait une
    // migration, et l'ignorer ne coûte rien.
    if (isFeature(row.feature)) stored[row.feature] = row.enabled;
  }
  return effectiveFeatures(stored, { hasBankAccount: treasury.some((a) => a.kind === 'bank') });
}

export interface TreasuryAccount {
  code: string;
  label: string;
  kind: 'bank' | 'cash' | 'wallet' | 'third_party';
}

/**
 * Les comptes de trésorerie actifs du club, tels que les menus en ont besoin.
 *
 * Lus en SQL nu plutôt que par le schéma du domaine comptable : ce domaine-ci est à la
 * racine de tous les autres (l'en-tête des PDF, le titre des pages), et l'importer
 * depuis la comptabilité qui l'importe déjà ferait un cycle. Trois colonnes stables
 * — `code`, `label`, `kind` — c'est tout ce que le club en sait : un compte bancaire
 * ouvre la comptabilité, une caisse ou un porte-monnaie fait une entrée de menu.
 */
export async function listTreasuryAccounts(db: DbOrTx): Promise<TreasuryAccount[]> {
  const rows = await db.all<{ code: string; label: string; kind: TreasuryAccount['kind'] }>(
    sql`SELECT code, label, kind FROM accounts WHERE active = 1 ORDER BY id`
  );
  return rows.map((r) => ({ code: r.code, label: r.label, kind: r.kind }));
}

export class ClubFeaturesRepository {
  /**
   * Règle un lot de fonctionnalités d'un coup.
   *
   * Une ligne par clé, insérée ou mise à jour : l'écran envoie l'état complet de sa
   * section, et l'absence d'une clé en base continue de valoir « allumée ».
   */
  async setMany(db: Db, changes: Partial<Record<Feature, boolean>>, actorEmail: string, now: Date): Promise<void> {
    const entries = Object.entries(changes).filter(([k]) => isFeature(k)) as [Feature, boolean][];
    if (entries.length === 0) return;

    // Deux instructions dans un lot : la table est petite (une vingtaine de lignes
    // au plus), la suppression puis la réinsertion restent sous la limite des
    // 100 variables liées de D1 (voir repo-guardrails).
    const keys = entries.map(([k]) => k);
    await db.batch([
      db.delete(clubFeaturesTable).where(inArray(clubFeaturesTable.feature, keys)),
      db.insert(clubFeaturesTable).values(
        entries.map(([feature, enabled]) => ({ feature, enabled, updatedByEmail: actorEmail, updatedAt: now }))
      )
    ]);
    forgetClubFeatures(db);
  }
}
