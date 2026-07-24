export interface Expense {
  id: number;
  seasonId: string;
  description: string;
  category: string;
  amount: number;
  photoUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  emitterName: string;
  memberId: number | null;
  transactionId: number | null;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface Category {
  id: string;
  code?: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export const categoryColors: Record<string, string> = {
  fonctionnement_administratif: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  materiel_club: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  volants: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  evenements_buvettes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  championnats: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  stages_formations: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  adhesions_inscriptions: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  sponsoring: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  subventions: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  actions_jeunes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  tournois_senior: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cordage_vente: 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20',
  salaires_charges: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  licences_federation: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
};

export function getCategoryOptions(categories: Category[] = []): CategoryOption[] {
  return categories.map(c => ({ value: c.id, label: c.adminLabel }));
}

export function getCategoryLabels(categories: Category[] = []): Record<string, string> {
  return categories.reduce((acc, c) => {
    acc[c.id] = c.adminLabel;
    if (c.code) acc[c.code] = c.adminLabel;
    return acc;
  }, {} as Record<string, string>);
}
