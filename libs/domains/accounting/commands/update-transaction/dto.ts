export interface UpdateTransactionDTO {
  seasonId: string;
  type: 'recette' | 'depense' | 'transfert';
  accountId: string;
  destinationAccountId?: string;
  category?: string | number;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference?: string;
}
