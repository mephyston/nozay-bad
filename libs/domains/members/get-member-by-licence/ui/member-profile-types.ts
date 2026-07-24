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

  amountDue: number;
  amountReceived: number;
  amountRemaining: number;
  paid: boolean;

  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
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
  actions_jeunes: 'Actions Jeunes',
  tournois_senior: 'Tournois Senior',
  evenements_buvettes: 'Evénements & Buvette',
  cordage_vente: 'Cordage',
  volants: 'Volants',
  salaires_charges: 'Salaires & Charges',
  materiel_club: 'Matériel club',
  licences_federation: 'Licence fédération',
  championnats: 'Championnats',
  stages_formations: 'Stages & Formations',
  fonctionnement_administratif: 'Fonctionnement & Admin'
};
