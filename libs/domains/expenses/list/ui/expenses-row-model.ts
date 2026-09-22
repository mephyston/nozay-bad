import { Check, Edit2, Eye, RefreshCw, X } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import type { Expense } from './expenses-types';

/**
 * Le vocabulaire des notes de frais.
 *
 * Deux tableaux en rendaient chacun deux versions — une ligne et une carte — avec leurs
 * libellés recopiés et leurs menus écrits à la main. Les couleurs de catégorie, elles,
 * vivaient dans une table de classes Tailwind écrites à la main, hors des jetons.
 */

export type StatutDeNote = 'pending' | 'approved' | 'rejected';

const STATUTS: Record<StatutDeNote, { label: string; variant: string; ton: Tone }> = {
  pending: { label: 'En attente', variant: 'warning', ton: 'foreground' },
  approved: { label: 'Remboursée', variant: 'success', ton: 'success' },
  rejected: { label: 'Rejetée', variant: 'destructive', ton: 'muted' }
};

export const statutDeNote = (exp: Pick<Expense, 'status'>) =>
  STATUTS[exp.status as StatutDeNote] ?? STATUTS.pending;

export function dateFr(value: string | Date): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export type LigneDeNote = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'une note de frais en ligne de liste.
 *
 * Le bénéficiaire identifie — c'est lui qu'on rembourse —, le motif dit de quoi il
 * s'agit, la date situe, et le montant est la valeur qui compte. La catégorie et
 * l'existence d'un justificatif se disent par badge : la première est une imputation
 * comptable, le second est l'exception qui empêche de valider.
 *
 * Le montant s'éteint sur une note rejetée : rien n'a été remboursé.
 */
export function ligneDeNote(
  exp: Expense,
  categoryLabels: Record<string, string> = {}
): LigneDeNote {
  return {
    titre: exp.emitterName,
    sousTitre: `${dateFr(exp.createdAt)} · ${exp.description}`,
    valeur: formatAmount(exp.amount),
    ton: statutDeNote(exp).ton
  };
}

/** Le libellé lisible d'une catégorie, ou son code à défaut de traduction. */
export const libelleDeCategorie = (exp: Expense, labels: Record<string, string> = {}): string =>
  labels[exp.category] || exp.category;

export type GestesDeNote = {
  isClosed?: boolean;
  onSelectPhoto: (url: string) => void;
  /** En attente seulement : valider, rejeter, modifier. */
  onAction?: (id: number, action: 'approve' | 'reject') => void;
  onStartEdit?: (exp: Expense) => void;
  /** Historique seulement : défaire la décision. */
  onCancelValidation?: (id: number) => void;
};

/**
 * Ce qu'on peut faire d'une note, selon où elle en est.
 *
 * **Valider vient en tête** : c'est la décision courante d'une file d'attente, et elle
 * se défait depuis l'historique — la condition pour qu'un balayage long la porte. Le
 * rejet vient ensuite, et il porte sa question : c'est un refus qu'on annonce à
 * quelqu'un.
 *
 * Le justificatif s'ouvre depuis la rangée quand il existe : sur un téléphone, c'est
 * même la seule façon de le lire, la colonne « Voir » disparaissant avec la table.
 */
export function gestesDeNote(exp: Expense, gestes: GestesDeNote): SwipeAction<Expense>[] {
  const liste: SwipeAction<Expense>[] = [];

  if (!gestes.isClosed && exp.status === 'pending' && gestes.onAction) {
    liste.push({
      id: 'valider',
      /*
        « Rembourser », et non « Valider ».

        Les deux vivaient côte à côte : la carte mobile disait l'un, le menu du tableau
        l'autre, pour le même geste. Le statut qui en résulte tranche — il dit
        « Remboursée » — et le mot est plus juste : il annonce que l'argent sort.
      */
      label: 'Rembourser',
      icon: Check,
      tone: 'primary',
      run: (x) => gestes.onAction!(x.id, 'approve')
    });
  }
  if (!gestes.isClosed && exp.status === 'pending' && gestes.onStartEdit) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Edit2, run: (x) => gestes.onStartEdit!(x) });
  }
  if (exp.photoUrl) {
    liste.push({
      id: 'justificatif',
      label: 'Voir le justificatif',
      icon: Eye,
      run: (x) => gestes.onSelectPhoto(x.photoUrl!)
    });
  }
  if (!gestes.isClosed && exp.status === 'pending' && gestes.onAction) {
    liste.push({
      id: 'rejeter',
      label: 'Rejeter',
      icon: X,
      tone: 'destructive',
      confirm: `Rejeter la note de frais de ${exp.emitterName} ? Elle en sera informée.`,
      run: (x) => gestes.onAction!(x.id, 'reject')
    });
  }
  if (!gestes.isClosed && exp.status !== 'pending' && gestes.onCancelValidation) {
    liste.push({
      id: 'rouvrir',
      label: 'Remettre en attente',
      icon: RefreshCw,
      tone: 'primary',
      run: (x) => gestes.onCancelValidation!(x.id)
    });
  }

  return liste;
}
