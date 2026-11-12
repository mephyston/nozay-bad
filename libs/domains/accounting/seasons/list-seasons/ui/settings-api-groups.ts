import { uiConfirm, readApiError } from '@nba/ui';
import { runSettingsAction, type SettingsState } from './settings-api-classes';
import type { CategoryGroup, CategoryGroupKind } from './settings-types';

/**
 * Les pôles et rubriques du tableau de bord : même relais que les catégories.
 *
 * Aucun message de réussite : la liste réaffichée montre déjà le regroupement ajouté,
 * renommé, déplacé ou disparu.
 */
const RELAIS = '/admin/api/accounting/config';

export function createCategoryGroup(state: SettingsState, kind: CategoryGroupKind, label: string) {
  return runSettingsAction(state, {
    validate: () => (label.trim() ? null : 'Le libellé est obligatoire.'),
    body: { action: 'create_category_group', kind, label: label.trim() },
    success: ''
  });
}

export function updateCategoryGroup(
  state: SettingsState,
  group: CategoryGroup,
  updates: { label?: string; position?: number; membershipFees?: boolean }
) {
  return runSettingsAction(state, {
    validate: () => (updates.label === undefined || updates.label.trim() ? null : 'Le libellé ne peut pas être vide.'),
    body: { action: 'update_category_group', id: group.id, updates },
    success: ''
  });
}

/**
 * Monte ou descend un regroupement d'un cran : les deux voisins échangent leur position.
 *
 * Deux écritures pour un geste. La première part seule : `runSettingsAction` recharge
 * l'écran dès qu'elle aboutit, la seconde n'aurait jamais été envoyée.
 */
export async function moveCategoryGroup(state: SettingsState, groups: CategoryGroup[], index: number, delta: -1 | 1) {
  const other = groups[index + delta];
  const group = groups[index];
  if (!group || !other) return false;
  // Positions égales (reprise, ajouts manuels) : on repart de l'ordre affiché.
  const [a, b] = group.position === other.position ? [index + delta, index] : [other.position, group.position];
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_category_group', id: group.id, updates: { position: a } })
  });
  if (!res.ok) {
    state.errorMsg = await readApiError(res, 'Une erreur est survenue.');
    return false;
  }
  return runSettingsAction(state, { body: { action: 'update_category_group', id: other.id, updates: { position: b } }, success: '' });
}

export async function deleteCategoryGroup(state: SettingsState, group: CategoryGroup) {
  const suite = group.categoryCount > 0
    ? ` Ses ${group.categoryCount} catégorie(s) n'y seront plus rangées.`
    : '';
  if (!(await uiConfirm(`Supprimer « ${group.label} » ?${suite}`))) return false;
  return runSettingsAction(state, {
    body: { action: 'delete_category_group', id: group.id },
    success: ''
  });
}

/** Range une catégorie dans un pôle ou une rubrique ; null l'en retire. */
export function assignCategory(state: SettingsState, categoryId: number, updates: { poleId?: number | null; rubriqueId?: number | null }) {
  return runSettingsAction(state, {
    body: { action: 'update_category', id: categoryId, updates },
    success: ''
  });
}
