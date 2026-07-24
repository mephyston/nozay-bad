export interface BankStatementLine {
  id: number;
  fitid: string;
  accountId: 'current' | 'savings' | 'cash';
  amount: number;
  date: string;
  name: string;
  memo: string | null;
  status: 'pending' | 'reconciled' | 'ignored';
  aiSuggestions: string | null;
}

export interface GLTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  accountId: 'current' | 'savings' | 'cash';
  amount: number;
  date: string;
  description: string;
  category?: string | null;
  bankStatementLineId?: number | null;
}

export interface Season {
  id: string;
  code?: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  seasonId: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  subject: string | null;
  location: string | null;
  period: string | null;
  attendees: string | null;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  amountRemaining: number;
}

export interface ReconciliationStateProps {
  bankStatementLines: BankStatementLine[];
  glTransactions: GLTransaction[];
  seasonId: string;
  seasons: Season[];
  members: Member[];
  dbCategories?: any[];
}

export const accountLabels = {
  current: 'Compte Courant',
  savings: 'Compte Livret',
  cash: 'Caisse Physique'
};
