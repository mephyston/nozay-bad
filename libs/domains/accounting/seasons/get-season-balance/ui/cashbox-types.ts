export interface CashTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  accountId: 'current' | 'savings' | 'cash';
  destinationAccountId: 'current' | 'savings' | 'cash' | null;
  category: string | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference: string | null;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export const categoryLabels: Record<string, string> = {
  evenements_buvettes: 'Événements & Buvette',
  evenements_club: 'Événements & Buvette',
  boutique: 'Boutique & Cordages',
  adhesions_inscriptions: 'Adhésion',
  volants: 'Volants',
  materiel_club: 'Matériel club',
  divers_recette: 'Divers Recette',
  divers_depense: 'Divers Dépense'
};
