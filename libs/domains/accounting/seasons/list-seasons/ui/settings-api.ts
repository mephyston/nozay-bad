import { uiConfirm } from '@nba/ui';
import { showMessage, type SettingsState } from './settings-api-classes';

export * from './settings-api-classes';

export async function createSeason(state: SettingsState, id: string, name: string, active: boolean) {
  if (!id.trim() || !name.trim()) {
    state.errorMsg = 'Veuillez remplir tous les champs de la saison.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_season',
        id: id.trim(),
        name: name.trim(),
        active
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la création de la saison.');
    }

    showMessage(state, 'Saison créée avec succès !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function toggleSeasonActive(state: SettingsState, id: string) {
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'activate_season',
        id
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur de changement de saison active.');
    }

    showMessage(state, 'Saison active mise à jour !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function closeSeason(state: SettingsState, id: string, confirmOverwrite: boolean = false) {
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close_season',
        id,
        confirmOverwrite
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur de clôture de la saison.');
    }

    showMessage(state, 'Saison clôturée avec succès !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
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


export async function createCategory(state: SettingsState, data: {
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode: string | null;
  expenseCode: string | null;
}) {
  if (!data.adminLabel.trim() || !data.adherentLabel.trim()) {
    state.errorMsg = 'Veuillez remplir tous les champs de la catégorie.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_category',
        adminLabel: data.adminLabel,
        adherentLabel: data.adherentLabel,
        hideInExpenses: data.hideInExpenses,
        receiptCode: data.receiptCode,
        expenseCode: data.expenseCode
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur de création de la catégorie.');
    }

    showMessage(state, 'Catégorie créée avec succès !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function updateCategory(state: SettingsState, id: number, updates: {
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode: string | null;
  expenseCode: string | null;
}) {
  if (!updates.adminLabel.trim() || !updates.adherentLabel.trim()) {
    state.errorMsg = 'Les libellés ne peuvent pas être vides.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_category',
        id,
        updates
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la modification.');
    }

    showMessage(state, 'Catégorie mise à jour avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function deleteCategory(state: SettingsState, id: number) {
  if (!(await uiConfirm('Voulez-vous vraiment supprimer cette catégorie ?'))) return;
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_category',
        id
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la suppression.');
    }

    showMessage(state, 'Catégorie supprimée avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function createProductCategory(state: SettingsState, data: {
  label: string;
  accountingCategoryId: number;
  active: boolean;
}) {
  if (!data.label.trim()) {
    state.errorMsg = 'Le libellé ne peut pas être vide.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_product_category',
        ...data
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur de création de la catégorie produit.');
    }

    showMessage(state, 'Catégorie produit créée avec succès !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function updateProductCategory(state: SettingsState, id: number, updates: {
  label: string;
  accountingCategoryId: number;
  active: boolean;
}) {
  if (!updates.label.trim()) {
    state.errorMsg = 'Le libellé ne peut pas être vide.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_product_category',
        id,
        updates
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la modification.');
    }

    showMessage(state, 'Catégorie produit mise à jour avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function deleteProductCategory(state: SettingsState, id: number) {
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_product_category',
        id
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la suppression.');
    }

    showMessage(state, 'Catégorie produit supprimée avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}
