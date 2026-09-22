import { Edit2, Trash2 } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import { montantSigneCents } from '../../../ledger/list-ledger-entries/ui/ledger-row-model';
import { accountLabelOf, type AccountLike } from '../../../shared/account-labels';
import type { AccountEntry } from './account-types';

/**
 * Le vocabulaire d'un compte sans relevé — la caisse, le porte-monnaie, les bons.
 *
 * Le sens d'un mouvement, le nom de l'autre bout d'un virement et la liste des gestes
 * vivaient dans une ligne de tableau. Le signe, lui, vient du grand livre : un mouvement
 * est une écriture, et deux façons de le signer auraient fini par se contredire.
 */

export type LigneDeCompte = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'un mouvement en ligne de liste.
 *
 * La description identifie, la date et la catégorie situent — ou, pour un virement, le
 * compte d'en face et son sens, sans quoi un mouvement entrant et un sortant se
 * ressemblent. Le montant signé est la valeur qui compte.
 */
export function ligneDeCompte(tx: AccountEntry, accounts: readonly AccountLike[] = []): LigneDeCompte {
  const cents = montantSigneCents(tx as never);
  const contexte =
    tx.type === 'transfert'
      ? `${tx.transferLeg === 'destination' ? 'depuis' : 'vers'} ${accountLabelOf(accounts, tx.counterpartAccountId)}`
      : (tx.category ?? 'Sans catégorie');

  return {
    titre: tx.description,
    sousTitre: `${tx.date} · ${contexte}`,
    valeur: formatAmount(cents, { showSign: true }),
    ton: cents < 0 ? 'destructive' : cents > 0 ? 'success' : 'muted'
  };
}

/**
 * Ce qu'on peut faire d'un mouvement.
 *
 * Aucune question portée ici : l'écran en pose déjà une, et elle **dépend du
 * mouvement** — supprimer une jambe de virement efface les deux, sur les deux comptes.
 * La doubler ferait répondre deux fois à la même chose, et la seconde serait la moins
 * précise.
 */
export function gestesDeMouvement(
  tx: AccountEntry,
  {
    isClosed = false,
    canWrite = true,
    canDelete = true,
    onEdit,
    onDelete
  }: {
    isClosed?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    onEdit?: (tx: AccountEntry) => void;
    onDelete: (id: number) => void;
  }
): SwipeAction<AccountEntry>[] {
  if (isClosed) return [];
  const liste: SwipeAction<AccountEntry>[] = [];
  if (onEdit && canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Edit2, tone: 'primary', run: (x) => onEdit(x) });
  }
  if (canDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: (x) => onDelete(x.id)
    });
  }
  return liste;
}
