import { Edit2, Trash2 } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import { accrualLabel } from '../../../shared/accrual-labels';
import { accountLabelOf, type AccountLike } from '../../../shared/account-labels';
import type { Transaction } from './ledger-types';

/**
 * Le vocabulaire du grand livre, en un seul endroit.
 *
 * La table de bureau et les cartes mobiles écrivaient chacune leur version du même
 * contenu : deux formats de montant, deux rendus de badge, deux façons de nommer les
 * deux bouts d'un virement. Tout ce qui se lit à l'écran passe désormais par ici, et
 * se teste sans monter de composant.
 */

/** Le montant en centimes, quelle que soit la forme servie par le relais. */
export const montantCents = (tx: Pick<Transaction, 'amount'>): number =>
  (tx as { amountCents?: number }).amountCents ?? tx.amount;

/**
 * Le montant **signé du point de vue du compte affiché**.
 *
 * Une dépense retire, une recette ajoute, et un virement fait l'un ou l'autre selon la
 * jambe : sur un compte filtré, un virement entrant et un virement sortant étaient
 * rigoureusement identiques à l'œil sans ce signe.
 */
export function montantSigneCents(tx: Pick<Transaction, 'amount' | 'type' | 'transferLeg'>): number {
  const brut = montantCents(tx);
  if (tx.type === 'depense') return -brut;
  if (tx.type === 'transfert') return (tx.transferLeg === 'destination' ? 1 : -1) * brut;
  return brut;
}

/** Ce qui entre est vert, ce qui sort est rouge. Le ton ne dit jamais autre chose. */
export const tonDuMontant = (cents: number): Tone =>
  cents < 0 ? 'destructive' : cents > 0 ? 'success' : 'muted';

/** `2026-09-12` → `2026-09`. La clé de regroupement mensuel de la liste. */
export const moisDe = (date: string): string => (date || '').substring(0, 7);

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * `2026-09` → `septembre 2026`.
 *
 * En minuscules : le nom sert aussi au milieu d'une phrase — « Solde fin septembre
 * 2026 » —, où une capitale serait fautive. L'en-tête de section, lui, le met en
 * capitales par la feuille de style.
 */
export function libelleDeMois(cle: string): string {
  const [annee, mois] = (cle || '').split('-');
  const nom = MOIS[parseInt(mois, 10) - 1];
  if (!nom || !annee) return cle;
  return `${nom} ${annee}`;
}

/** `2026-09-12` → `12/09`. L'année est déjà dans l'en-tête de section. */
export function jourEtMois(date: string): string {
  const [, mois, jour] = (date || '').split('-');
  return mois && jour ? `${jour}/${mois}` : date;
}

/**
 * Ce qu'une écriture doit signaler, et rien de plus.
 *
 * Trois badges tenaient sur la carte mobile : le type, la régularisation et
 * « rapprochée ». Le type est déjà dit par le signe et la couleur du montant, et
 * « rapprochée » est le cas courant — un badge qui s'affiche presque toujours cesse
 * d'être un signal. Restent les deux situations qui demandent une vérification, et la
 * recette rendue, dont le montant rouge passerait sinon pour une erreur.
 */
export function signalement(
  tx: Transaction,
  saisonAffichee?: number | string
): { label: string; variant: 'warning' | 'secondary' } | null {
  const accrual = accrualLabel(tx.accrualType);
  if (accrual) return { label: accrual, variant: 'warning' };
  if (saisonAffichee && String(tx.seasonId) !== String(saisonAffichee)) {
    return { label: 'Autre exercice', variant: 'secondary' };
  }
  // Une recette en rouge surprend : le badge dit que c'est voulu — de l'argent rendu.
  if (tx.type === 'recette' && montantCents(tx) < 0) return { label: 'Remboursement', variant: 'secondary' };
  return null;
}

export type LigneEcriture = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
  legende?: string;
};

/**
 * Projection d'une écriture en ligne de liste.
 *
 * Le libellé identifie — c'est ce qu'on cherche des yeux —, la date et la catégorie
 * situent, le montant signé est la seule valeur qui compte à droite, et le solde
 * progressif le suit en légende. Le moyen de paiement, la référence, l'adhérent
 * rattaché et l'état de rapprochement vivent dans le formulaire, à un appui.
 */
export function ligneEcriture(
  tx: Transaction,
  options: {
    accounts?: AccountLike[];
    categories?: { id: string; name: string }[];
    /** Faux quand la liste est filtrée : le solde progressif n'a alors plus de sens. */
    showBalance?: boolean;
  } = {}
): LigneEcriture {
  const { accounts = [], categories = [], showBalance = true } = options;
  const cents = montantSigneCents(tx);

  const contexte =
    tx.type === 'transfert'
      ? tx.transferLeg === 'destination'
        ? `${accountLabelOf(accounts, tx.counterpartAccountId)} → ${accountLabelOf(accounts, tx.accountId)}`
        : `${accountLabelOf(accounts, tx.accountId)} → ${accountLabelOf(accounts, tx.counterpartAccountId)}`
      : tx.category
        ? (categories.find((c) => c.id === String(tx.category))?.name ?? String(tx.category))
        : 'Sans catégorie';

  return {
    titre: tx.description,
    sousTitre: `${jourEtMois(tx.date)} · ${contexte}`,
    valeur: formatAmount(cents, { showSign: true }),
    ton: tonDuMontant(cents),
    legende:
      showBalance && tx.runningBalanceCents !== undefined
        ? formatAmount(tx.runningBalanceCents)
        : undefined
  };
}

/**
 * Les actions d'une écriture, déclarées une fois.
 *
 * Éditer vient en tête : c'est elle qu'un balayage long exécute, et elle est sans
 * conséquence. La suppression porte sa question — c'est `runAction` qui la pose,
 * la même pour le balayage, le menu de la liste et le menu de la table. Elle
 * remplace la boîte de dialogue que l'écran portait à la main.
 */
export function actionsDEcriture(
  tx: Transaction,
  {
    isClosed = false,
    onStartEdit,
    onDelete
  }: {
    isClosed?: boolean;
    onStartEdit?: (tx: Transaction, e: MouseEvent) => void;
    onDelete?: (id: number) => void;
  }
): SwipeAction<Transaction>[] {
  if (isClosed) return [];
  const liste: SwipeAction<Transaction>[] = [];
  if (onStartEdit) {
    liste.push({
      id: 'editer',
      label: 'Éditer',
      icon: Edit2,
      tone: 'primary',
      run: (x) => onStartEdit(x, new MouseEvent('click'))
    });
  }
  if (onDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      confirm: 'Supprimer cette écriture comptable ? Cette action est sans retour.',
      run: (x) => onDelete(x.id)
    });
  }
  return liste;
}

/**
 * Une opération ventilée : plusieurs écritures rattachées à la même ligne de relevé.
 *
 * Le rapprochement permet de ventiler un encaissement unique sur plusieurs catégories.
 * Le journal les affichait à plat, ce qui faisait lire cinq lignes là où la banque n'en
 * voit qu'une, et dont aucune ne portait le montant reçu.
 */
export type OperationVentilee = {
  isGroup: true;
  id: string;
  date: string;
  type: 'recette' | 'depense' | 'transfert';
  amountCents: number;
  runningBalanceCents: number | undefined;
  bankStatementLineId: number;
  description: string;
  reference: string;
  children: Transaction[];
};

export type LigneDeJournal = Transaction | OperationVentilee;

/**
 * Regroupe les écritures consécutives qui partagent une ligne de relevé.
 *
 * Consécutives seulement : la liste est triée par date, et deux ventilations d'une même
 * ligne ne peuvent pas être séparées par une écriture tierce. Un groupe d'une seule
 * ligne n'en est pas un — il se défait, sinon le journal afficherait un repli pour une
 * écriture ordinaire.
 */
export function grouperVentilations(transactions: Transaction[]): LigneDeJournal[] {
  const brut: LigneDeJournal[] = [];
  let courant: OperationVentilee | null = null;

  for (const tx of transactions) {
    const signe = montantSigneCents(tx);

    if (!tx.bankStatementLineId) {
      if (courant) {
        brut.push(courant);
        courant = null;
      }
      brut.push(tx);
      continue;
    }

    if (courant && courant.bankStatementLineId === tx.bankStatementLineId) {
      courant.children.push(tx);
      courant.amountCents += signe;
      continue;
    }

    if (courant) brut.push(courant);
    courant = {
      isGroup: true,
      id: `group-${tx.bankStatementLineId}`,
      date: tx.date,
      type: tx.type,
      amountCents: signe,
      // La liste descend dans le temps : la première ligne du groupe en porte le solde.
      runningBalanceCents: tx.runningBalanceCents,
      bankStatementLineId: tx.bankStatementLineId,
      description: 'Opération ventilée',
      reference: tx.reference || '',
      children: [tx]
    };
  }
  if (courant) brut.push(courant);

  return brut.map((item) => {
    if (!('isGroup' in item) || !item.isGroup) return item;
    if (item.children.length === 1) return item.children[0];
    item.type = item.amountCents >= 0 ? 'recette' : 'depense';
    item.amountCents = Math.abs(item.amountCents);
    return item;
  });
}

export const estVentilation = (item: LigneDeJournal): item is OperationVentilee =>
  'isGroup' in item && item.isGroup === true;
