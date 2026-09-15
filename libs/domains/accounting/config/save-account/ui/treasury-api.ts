import { runSettingsAction, type SettingsState } from '../../../seasons/list-seasons/ui/settings-api-classes';

/** Le relais de l'écran « Comptes et moyens de paiement », dans le domaine comptable. */
const RELAIS = '/admin/api/accounting/treasury';

export interface AccountValues {
  code: string;
  label: string;
  accountClassCode: string;
  kind: 'bank' | 'cash' | 'wallet' | 'voucher';
  statementAccountNumber: string;
}

export interface PaymentMethodValues {
  code: string;
  label: string;
  kind: 'transfer' | 'cheque' | 'cash' | 'card' | 'voucher';
  defaultAccountCode: string;
  defaultEntryStatus: 'cleared' | 'in_vault' | 'pending_debit';
  storefront: boolean;
}

const CODE = /^[a-z][a-z0-9_]{1,31}$/;

export function createAccount(state: SettingsState, data: AccountValues) {
  return runSettingsAction(state, {
    validate: () => validateAccount(data, true),
    body: { action: 'create_account', ...data },
    success: 'Compte créé.',
    endpoint: RELAIS
  });
}

export function updateAccount(state: SettingsState, id: number, data: Omit<AccountValues, 'code'>) {
  return runSettingsAction(state, {
    validate: () => validateAccount(data, false),
    body: { action: 'update_account', id, ...data },
    success: 'Compte mis à jour.',
    endpoint: RELAIS
  });
}

export function setAccountActive(state: SettingsState, id: number, active: boolean) {
  return runSettingsAction(state, {
    body: { action: 'update_account', id, active },
    success: active ? 'Compte réactivé.' : 'Compte désactivé.',
    endpoint: RELAIS
  });
}

export function createPaymentMethod(state: SettingsState, data: PaymentMethodValues) {
  return runSettingsAction(state, {
    validate: () => validatePaymentMethod(data, true),
    body: { action: 'create_payment_method', ...data },
    success: 'Moyen de paiement créé.',
    endpoint: RELAIS
  });
}

export function updatePaymentMethod(state: SettingsState, id: number, data: Omit<PaymentMethodValues, 'code'>) {
  return runSettingsAction(state, {
    validate: () => validatePaymentMethod(data, false),
    body: { action: 'update_payment_method', id, ...data },
    success: 'Moyen de paiement mis à jour.',
    endpoint: RELAIS
  });
}

export function setPaymentMethodFlags(state: SettingsState, id: number, flags: { active?: boolean; storefront?: boolean }) {
  const success =
    flags.active !== undefined
      ? flags.active ? 'Moyen de paiement réactivé.' : 'Moyen de paiement désactivé : plus proposé nulle part.'
      : flags.storefront ? 'Proposé à nouveau dans la boutique.' : 'Retiré de la boutique des adhérents.';
  return runSettingsAction(state, {
    body: { action: 'update_payment_method', id, ...flags },
    success,
    endpoint: RELAIS
  });
}

/** Refusé par l'API dès qu'une écriture ou une commande y renvoie : le message le dit, et l'écran le montre. */
export function deletePaymentMethod(state: SettingsState, id: number) {
  return runSettingsAction(state, {
    body: { action: 'delete_payment_method', id },
    success: 'Moyen de paiement supprimé.',
    endpoint: RELAIS
  });
}

function validateAccount(data: Partial<AccountValues>, creating: boolean): string | null {
  if (creating && !CODE.test(data.code ?? '')) return 'Le code : des minuscules, chiffres et tirets bas, sans espace (ex. livret_a).';
  if (!data.label?.trim()) return 'Le libellé est obligatoire.';
  if (!data.accountClassCode) return 'Choisissez la classe du plan comptable.';
  return null;
}

function validatePaymentMethod(data: Partial<PaymentMethodValues>, creating: boolean): string | null {
  if (creating && !CODE.test(data.code ?? '')) return 'Le code : des minuscules, chiffres et tirets bas, sans espace (ex. cheque_vacances).';
  if (!data.label?.trim()) return 'Le libellé est obligatoire.';
  if (!data.defaultAccountCode) return 'Choisissez le compte que ce moyen crédite.';
  return null;
}
