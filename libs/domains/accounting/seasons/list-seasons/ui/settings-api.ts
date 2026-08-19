import { uiConfirm } from '@nba/ui';
import { runSettingsAction, type SettingsState } from './settings-api-classes';

export * from './settings-api-classes';

export function createSeason(state: SettingsState, id: string, name: string, active: boolean) {
  return runSettingsAction(state, {
    validate: () => (id.trim() && name.trim() ? null : 'Veuillez remplir tous les champs de la saison.'),
    body: { action: 'create_season', id: id.trim(), name: name.trim(), active },
    success: 'Saison créée.'
  });
}

export function toggleSeasonActive(state: SettingsState, id: string) {
  return runSettingsAction(state, {
    body: { action: 'activate_season', id },
    success: 'Saison active mise à jour.'
  });
}

export function closeSeason(state: SettingsState, id: string, confirmOverwrite: boolean = false) {
  return runSettingsAction(state, {
    body: { action: 'close_season', id, confirmOverwrite },
    success: 'Saison clôturée.'
  });
}

export async function checkCloseSeason(id: string) {
  const res = await fetch(window.location.pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'check_close_season',
      id
    })
  });

  if (!res.ok) {
    throw new Error(await res.text() || 'Erreur lors de la vérification de clôture.');
  }

  const json = await res.json() as { data: any };
  return json.data;
}

export interface CategoryValues {
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode: string | null;
  expenseCode: string | null;
}

export function createCategory(state: SettingsState, data: CategoryValues) {
  return runSettingsAction(state, {
    validate: () => (data.adminLabel.trim() && data.adherentLabel.trim() ? null : 'Veuillez remplir tous les champs de la catégorie.'),
    body: { action: 'create_category', ...data },
    success: 'Catégorie créée.'
  });
}

export function updateCategory(state: SettingsState, id: number, updates: CategoryValues) {
  return runSettingsAction(state, {
    validate: () => (updates.adminLabel.trim() && updates.adherentLabel.trim() ? null : 'Les libellés ne peuvent pas être vides.'),
    body: { action: 'update_category', id, updates },
    success: 'Catégorie mise à jour.'
  });
}

export async function deleteCategory(state: SettingsState, id: number) {
  if (!(await uiConfirm('Voulez-vous vraiment supprimer cette catégorie ?'))) return false;
  return runSettingsAction(state, {
    body: { action: 'delete_category', id },
    success: 'Catégorie supprimée.'
  });
}

export interface ProductCategoryValues {
  label: string;
  accountingCategoryId: number;
  active: boolean;
}

export function createProductCategory(state: SettingsState, data: ProductCategoryValues) {
  return runSettingsAction(state, {
    validate: () => (data.label.trim() ? null : 'Le libellé ne peut pas être vide.'),
    body: { action: 'create_product_category', ...data },
    success: 'Catégorie produit créée.'
  });
}

export function updateProductCategory(state: SettingsState, id: number, updates: ProductCategoryValues) {
  return runSettingsAction(state, {
    validate: () => (updates.label.trim() ? null : 'Le libellé ne peut pas être vide.'),
    body: { action: 'update_product_category', id, updates },
    success: 'Catégorie produit mise à jour.'
  });
}

export function deleteProductCategory(state: SettingsState, id: number) {
  return runSettingsAction(state, {
    body: { action: 'delete_product_category', id },
    success: 'Catégorie produit supprimée.'
  });
}
