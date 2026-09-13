/** Un compte de trésorerie tel que `GET /accounting/accounts` le rend à l'écran de configuration. */
export interface TreasuryAccountRow {
  id: number;
  code: string;
  label: string;
  classCode: string;
  classType: 'recette' | 'depense' | 'tresorerie';
  kind: 'bank' | 'cash' | 'wallet' | 'third_party';
  active: boolean;
  statementAccountNumber: string | null;
}

/** Un moyen de paiement tel que `GET /accounting/payment-methods` (sans filtre) le rend. */
export interface PaymentMethodRow {
  id: number;
  code: string;
  label: string;
  kind: 'transfer' | 'cheque' | 'cash' | 'card' | 'voucher' | 'internal';
  active: boolean;
  storefront: boolean;
  defaultAccountCode: string;
  defaultEntryStatus: 'cleared' | 'in_vault' | 'pending_debit';
  /** Écritures du grand livre qui y renvoient : un moyen référencé ne se supprime pas. */
  ledgerUses: number;
}

export interface AccountClassOption {
  code: string;
  label: string;
  type: 'recette' | 'depense' | 'tresorerie';
}

export const ACCOUNT_KIND_LABELS: Record<TreasuryAccountRow['kind'], string> = {
  bank: 'Compte bancaire',
  cash: 'Caisse',
  wallet: 'Porte-monnaie',
  third_party: "Compte d'attente"
};

export const ACCOUNT_KIND_HINTS: Record<Exclude<TreasuryAccountRow['kind'], 'third_party'>, string> = {
  bank: 'Se rapproche par relevé importé : compte courant, livret.',
  cash: 'Des espèces en main : buvette, ventes sur place. Un écran de caisse lui est dédié.',
  wallet: 'Un compte chez un tiers (Badnet…), alimenté et débité par les inscriptions. Un écran lui est dédié.'
};

export const PAYMENT_KIND_LABELS: Record<PaymentMethodRow['kind'], string> = {
  transfer: 'Virement',
  cheque: 'Chèque',
  cash: 'Espèces',
  card: 'Carte bancaire',
  voucher: 'Bon ou chèque tiers',
  internal: 'Virement interne'
};

export const PAYMENT_KIND_HINTS: Record<Exclude<PaymentMethodRow['kind'], 'internal'>, string> = {
  transfer: "La boutique montre l'IBAN du club ; l'écriture naît encaissée.",
  cheque: 'Chèque à l\'ordre du club ; l\'écriture attend en coffre jusqu\'à la remise.',
  cash: 'Remis en main propre ; l\'écriture naît encaissée.',
  card: 'Paiement par carte ou plateforme ; l\'écriture naît encaissée.',
  voucher: 'Chèque-vacances, coupon sport, bon d\'un comité d\'entreprise ; attend en coffre jusqu\'à la remise.'
};

export const ENTRY_STATUS_LABELS: Record<PaymentMethodRow['defaultEntryStatus'], string> = {
  cleared: 'Encaissé aussitôt',
  in_vault: 'En coffre, jusqu’à la remise',
  pending_debit: 'Débit en attente'
};

/** Le statut d'écriture qui va de soi pour une nature de moyen ; l'écran le propose, le trésorier peut le changer. */
export const DEFAULT_STATUS_BY_KIND: Record<Exclude<PaymentMethodRow['kind'], 'internal'>, PaymentMethodRow['defaultEntryStatus']> = {
  transfer: 'cleared',
  cheque: 'in_vault',
  cash: 'cleared',
  card: 'cleared',
  voucher: 'in_vault'
};
