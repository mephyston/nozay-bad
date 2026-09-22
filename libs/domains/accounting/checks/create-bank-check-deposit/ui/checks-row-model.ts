import { CheckCircle, FileText, Landmark, Pencil, Trash2 } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import { depositMonthLabel } from '../../../shared/deposit-month';
import type { Check, CheckDeposit } from './check-deposit-types';

/**
 * Le vocabulaire des chèques et de leurs bordereaux.
 *
 * Les deux écrans rendaient chacun deux fois le même contenu — une carte mobile et une
 * ligne de tableau — avec leurs libellés recopiés et leurs menus écrits à la main. Tout
 * passe désormais par ici, et se teste sans monter de composant.
 */

const centsDe = (v: { amount: number; amountCents?: number }): number => v.amountCents ?? v.amount;

/* ------------------------------------------------------------------ chèques */

export type LigneDeCheque = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

export function dateFr(value: string | Date): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

/**
 * Projection d'un chèque en ligne de liste.
 *
 * L'émetteur identifie — c'est le nom qu'on lit sur le chèque —, le numéro, la banque et
 * la date situent, le montant est la valeur qui compte. L'adhérent rattaché et le mois de
 * remise prévu se disent par badge, parce qu'ils sont l'exception : la plupart des chèques
 * sont à déposer dès que possible et déjà associés.
 */
export function ligneDeCheque(check: Check): LigneDeCheque {
  const situe = [`N° ${check.number}`, check.bank || null, dateFr(check.createdAt)]
    .filter(Boolean)
    .join(' · ');
  return {
    titre: check.emitter,
    sousTitre: situe,
    valeur: formatAmount(centsDe(check as never)),
    ton: 'foreground'
  };
}

/**
 * Ce qu'un chèque signale, et rien de plus.
 *
 * Inscrit sur un bordereau qui attend le guichet, il ne peut plus être retenu pour une
 * autre remise : c'est la seule chose qui change ce qu'on peut en faire. Le mois prévu
 * vient ensuite ; « dès que possible » est le cas courant et ne s'annonce pas.
 */
export function signalementDeCheque(
  check: Check
): { label: string; variant: 'warning' | 'secondary' } | null {
  if (check.checkDepositId) return { label: 'Remise à déposer', variant: 'warning' };
  /* Un mois hors des douze ne donne pas de libellé : mieux vaut aucun badge qu'un badge vide. */
  const mois = depositMonthLabel(check.plannedDepositMonth);
  return mois ? { label: mois, variant: 'secondary' } : null;
}

/** Un chèque déjà inscrit sur un bordereau ne se retient plus, ni ne se modifie. */
export const chequeDisponible = (check: Check, isClosed = false): boolean =>
  !isClosed && !check.checkDepositId;

export function gestesDeCheque(
  check: Check,
  {
    isClosed = false,
    onEdit,
    onDelete
  }: { isClosed?: boolean; onEdit: (c: Check) => void; onDelete: (id: number) => void }
): SwipeAction<Check>[] {
  if (!chequeDisponible(check, isClosed)) return [];
  return [
    { id: 'modifier', label: 'Modifier', icon: Pencil, tone: 'primary', run: (c) => onEdit(c) },
    {
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      confirm: `Supprimer le chèque n° ${check.number} de ${check.emitter} ? Cette action est sans retour.`,
      run: (c) => onDelete(c.id)
    }
  ];
}

/* ------------------------------------------------------------------ remises */

/** À déposer → déposée → encaissée : la remise naît sur le bureau, pas au guichet. */
const STATUTS_DE_REMISE: Record<string, { label: string; variant: string; ton: Tone }> = {
  cleared: { label: 'Encaissée', variant: 'success', ton: 'success' },
  deposited: { label: 'Déposée', variant: 'info', ton: 'foreground' },
  pending: { label: 'À déposer', variant: 'warning', ton: 'foreground' }
};

export const statutDeRemise = (dep: Pick<CheckDeposit, 'status'>) =>
  STATUTS_DE_REMISE[dep.status] ?? STATUTS_DE_REMISE.pending;

export type LigneDeRemise = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'un bordereau en ligne de liste.
 *
 * La référence identifie, la date situe, le montant total est la valeur. L'état du
 * rapprochement se dit par le badge de statut : « encaissée » **est** le rapprochement,
 * et l'afficher une seconde fois en toutes lettres n'ajoutait rien.
 */
export function ligneDeRemise(dep: CheckDeposit): LigneDeRemise {
  return {
    titre: dep.reference,
    sousTitre: dateFr(dep.date),
    valeur: formatAmount(centsDe(dep as never)),
    ton: statutDeRemise(dep).ton
  };
}

export type GestesDeRemise = {
  isClosed?: boolean;
  onConsulter: (dep: CheckDeposit) => void;
  onConfirmer: (id: number) => void;
  onEncaisser: (dep: CheckDeposit) => void;
  onSupprimer: (id: number) => void;
};

/**
 * Ce qu'on peut faire d'un bordereau, selon où il en est.
 *
 * L'étape suivante vient en tête — confirmer le dépôt, puis encaisser — parce que c'est
 * le geste courant et qu'un balayage long doit tomber juste. La suppression porte sa
 * question : un bordereau supprimé rend ses chèques au coffre, ce qui se voit ailleurs.
 */
export function gestesDeRemise(dep: CheckDeposit, gestes: GestesDeRemise): SwipeAction<CheckDeposit>[] {
  const liste: SwipeAction<CheckDeposit>[] = [];

  if (!gestes.isClosed && dep.status === 'pending') {
    liste.push({
      id: 'confirmer',
      label: 'Confirmer le dépôt en banque',
      icon: Landmark,
      tone: 'primary',
      run: (d) => gestes.onConfirmer(d.id)
    });
  }
  if (!gestes.isClosed && dep.status === 'deposited') {
    liste.push({
      id: 'encaisser',
      label: 'Encaisser (ligne du relevé)',
      icon: CheckCircle,
      tone: 'primary',
      run: (d) => gestes.onEncaisser(d)
    });
  }

  liste.push({
    id: 'consulter',
    label: 'Consulter / imprimer',
    icon: FileText,
    run: (d) => gestes.onConsulter(d)
  });

  if (!gestes.isClosed) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer la remise',
      icon: Trash2,
      tone: 'destructive',
      confirm: `Supprimer la remise ${dep.reference} ? Ses chèques redeviennent disponibles.`,
      run: (d) => gestes.onSupprimer(d.id)
    });
  }

  return liste;
}
