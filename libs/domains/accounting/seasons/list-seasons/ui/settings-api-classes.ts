import { flashAndReload } from '@nba/ui';

export interface SettingsState {
  successMsg: string;
  errorMsg: string;
  isSubmitting: boolean;
}

export function showMessage(state: SettingsState, success: string, error = '') {
  state.successMsg = success;
  state.errorMsg = error;
  // Le rechargement effaçait le message au bout de 2 s : on le fait porter par le
  // flash, qui le rejoue une fois la page rechargée.
  if (success) flashAndReload(success);
}

export async function createAccountClass(state: SettingsState, data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) {
  if (!data.code.trim() || !data.label.trim()) {
    state.errorMsg = 'Le code et le libellé sont obligatoires.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/settings', {
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

export async function updateAccountClass(state: SettingsState, code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) {
  if (!updates.label.trim()) {
    state.errorMsg = 'Le libellé ne peut pas être vide.';
    return;
  }
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/settings', {
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
  state.isSubmitting = true;
  state.errorMsg = '';
  state.successMsg = '';

  try {
    const res = await fetch('/admin/settings', {
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
