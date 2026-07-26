export interface Transaction {
  id: number;
  seasonId: string;
  type: 'recette' | 'depense' | 'transfert';
  accountId: 'current' | 'savings' | 'cash';
  destinationAccountId: 'current' | 'savings' | 'cash' | null;
  category: string | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference: string | null;
  memberId?: number | null;
  bankStatementLineId?: number | null;
  memberName?: string | null;
  memberLicence?: string | null;
  runningBalanceCents?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BalanceReport {
  accountId: 'current' | 'savings' | 'cash';
  initialBalance: number;
  finalBalance: number;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface Category {
  id: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
}

export interface AccountClass {
  code: string;
  label: string;
  type: 'recette' | 'depense';
}

export const accountLabels: Record<string, string> = {
  current: 'Compte Courant',
  savings: 'Compte Livret',
  cash: 'Caisse Physique',
  '1': 'Compte Courant',
  '2': 'Compte Livret',
  '3': 'Caisse Physique'
};

export const formAccountOptions = [
  { value: 'current', label: 'Compte Courant' },
  { value: 'savings', label: 'Compte Livret' },
  { value: 'cash', label: 'Caisse Physique' }
];

export const methodLabels: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  labaz: 'LABAZ',
  ancv: 'ANCV',
  pass_sport: "Pass'Sport",
  ticket_loisir: 'Ticket Loisir',
  up_loisir: 'Up & Loisir'
};
