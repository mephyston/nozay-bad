import { type Db } from '@nba/db';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_IDS,
  isNotificationCategory
} from '../shared/categories';
import { normalizeEmail } from '../shared/vapid';
import { PreferencesRepository } from './repository';
import type { CategoryPreference, UpdatePreferencesInput } from './dto';

/**
 * Préférences du compte, catégorie par catégorie.
 *
 * Toujours les cinq catégories connues : l'écran de réglages doit pouvoir les
 * afficher toutes, y compris celles jamais touchées par l'adhérent (donc actives).
 */
export async function getPreferences(db: Db, email: string): Promise<CategoryPreference[]> {
  const repo = new PreferencesRepository();
  const disabled = new Set(await repo.findDisabled(db, normalizeEmail(email)));

  return NOTIFICATION_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    enabled: !disabled.has(category.id)
  }));
}

/**
 * Enregistre les réglages. L'appelant transmet l'état complet — la liste des
 * catégories coupées — plutôt qu'un delta : un écran de réglages envoie ce qu'il
 * affiche, et deux onglets ouverts ne peuvent pas se marcher dessus à moitié.
 */
export async function updatePreferences(
  db: Db,
  input: UpdatePreferencesInput,
  now: Date = new Date()
): Promise<CategoryPreference[]> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('Compte adhérent inconnu.');
  }

  const disabled = new Set(input.disabled.filter(isNotificationCategory));
  const repo = new PreferencesRepository();

  for (const category of NOTIFICATION_CATEGORY_IDS) {
    await repo.upsert(db, email, category, !disabled.has(category), now);
  }

  return getPreferences(db, email);
}
