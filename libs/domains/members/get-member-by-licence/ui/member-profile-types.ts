export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  importedAt: string;

  amountDue?: number;
  amountReceived?: number;
  amountRemaining?: number;
  amountDueCents?: number;
  amountReceivedCents?: number;
  amountRemainingCents?: number;
  paid: boolean;
  expenseAuthorized?: boolean;

  parent1Name?: string | null;
  parent1Email?: string | null;
  parent1Phone?: string | null;
  parent2Name?: string | null;
  parent2Email?: string | null;
  parent2Phone?: string | null;
}

export interface GLTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  amount: number;
  date: string;
  description: string;
  category: string | null;
  paymentMethod: string;
}

export const categoryLabels: Record<string, string> = {
  adhesions_inscriptions: 'Adhésion',
  sponsoring: 'Sponsoring',
  subventions: 'Subventions',
  stages: 'Stage / Événement',
  boutique: 'Boutique',
  licences_affiliations: 'Licences & Affiliations',
  achats_volants_materiel: 'Volants & Matériel',
  frais_deplacement: 'Déplacement / Tournoi',
  frais_bancaires: 'Frais bancaires',
  soirees_evenements: 'Soirée / Convivialité',
  remboursements_divers: 'Remboursement',
  autre: 'Autre'
};
