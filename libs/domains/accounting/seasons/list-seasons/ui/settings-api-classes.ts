import { submitForm, readApiError } from '@nba/ui';

/**
 * Destination des écritures : le relais de la comptabilité.
 *
 * Le plan comptable est de la configuration au sens du menu, mais de la **comptabilité**
 * au sens du domaine — c'est là que vivent ses permissions. Ce module visait
 * `window.location.pathname`, donc la page hôte, sans que rien ne le rappelle.
 */
const RELAIS = '/admin/api/accounting/config';

export interface SettingsState {
  errorMsg: string;
  isSubmitting: boolean;
}

/**
 * Toutes les écritures de l'écran Paramètres passent par le même chemin POST, et
 * partagent le même déroulé de soumission. `runSettingsAction` branche `submitForm`
 * sur l'état de l'écran : indicateur d'envoi, message d'échec affiché sur place,
 * confirmation et réaffichage pris en charge par le pattern.
 *
 * Renvoie `true` si l'écriture a abouti — l'appelant peut alors fermer son sheet.
 */
export function runSettingsAction(
  state: SettingsState,
  options: {
    validate?: () => string | null;
    body: unknown;
    success: string;
    /** Relais du domaine visé ; la comptabilité par défaut, la boutique pour ses catégories. */
    endpoint?: string;
  }
): Promise<boolean> {
  state.isSubmitting = true;
  state.errorMsg = '';

  return submitForm({
    validate: options.validate,
    submit: async () => {
      const res = await fetch(options.endpoint ?? RELAIS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body)
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Une erreur est survenue.'));
    },
    success: options.success,
    onError: (message) => { state.errorMsg = message; }
  }).finally(() => {
    state.isSubmitting = false;
  });
}

export function createAccountClass(state: SettingsState, data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) {
  return runSettingsAction(state, {
    validate: () => (data.code.trim() && data.label.trim() ? null : 'Le code et le libellé sont obligatoires.'),
    body: { action: 'create_account_class', code: data.code, label: data.label, type: data.type },
    success: 'Classe de compte créée.'
  });
}

export function updateAccountClass(state: SettingsState, code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) {
  return runSettingsAction(state, {
    validate: () => (updates.label.trim() ? null : 'Le libellé ne peut pas être vide.'),
    body: { action: 'update_account_class', code, label: updates.label, type: updates.type },
    success: 'Classe de compte mise à jour.'
  });
}

export function deleteAccountClass(state: SettingsState, code: string) {
  return runSettingsAction(state, {
    body: { action: 'delete_account_class', code },
    success: 'Classe de compte supprimée.'
  });
}
