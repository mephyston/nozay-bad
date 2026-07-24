export interface SettingsState {
  successMsg: string;
  errorMsg: string;
  isSubmitting: boolean;
}

export function showMessage(state: SettingsState, success: string, error = '') {
  state.successMsg = success;
  state.errorMsg = error;
  if (success) {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

export async function createSeason(state: SettingsState, id: string, name: string, active: boolean) {
  if (!id.trim() || !name.trim()) {
    state.errorMsg = 'Veuillez remplir tous les champs de la saison.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
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
    const res = await fetch('/admin/accounting/settings', {
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

export async function closeSeason(state: SettingsState, id: string) {
  if (!confirm(`Êtes-vous sûr de vouloir clôturer définitivement la saison ${id} ? Cette action est irréversible et bloquera toute modification.`)) {
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close_season',
        id
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

export async function createCategory(state: SettingsState, data: {
  code: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode: string | null;
  expenseCode: string | null;
}) {
  if (!data.code.trim() || !data.adminLabel.trim() || !data.adherentLabel.trim()) {
    state.errorMsg = 'Veuillez remplir tous les champs de la catégorie.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_category',
        id: data.code,
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
    const res = await fetch('/admin/accounting/settings', {
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
  if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return;
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
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

export async function createAccountClass(state: SettingsState, data: { code: string; label: string; type: 'recette' | 'depense' }) {
  if (!data.code.trim() || !data.label.trim()) {
    state.errorMsg = 'Le code et le libellé sont obligatoires.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_account_class',
        code: data.code,
        label: data.label,
        type: data.type
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la création de la classe de compte.');
    }

    showMessage(state, 'Classe de compte créée avec succès !');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function updateAccountClass(state: SettingsState, code: string, updates: { label: string; type: 'recette' | 'depense' }) {
  if (!updates.label.trim()) {
    state.errorMsg = 'Le libellé ne peut pas être vide.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_account_class',
        code,
        label: updates.label,
        type: updates.type
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la modification de la classe de compte.');
    }

    showMessage(state, 'Classe de compte mise à jour avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}

export async function deleteAccountClass(state: SettingsState, code: string) {
  if (!confirm('Voulez-vous vraiment supprimer cette classe de compte ?')) return;
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/accounting/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_account_class',
        code
      })
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Erreur lors de la suppression.');
    }

    showMessage(state, 'Classe de compte supprimée avec succès.');
  } catch (err: unknown) {
    state.errorMsg = (err as Error).message || 'Une erreur est survenue.';
    state.isSubmitting = false;
  }
}
