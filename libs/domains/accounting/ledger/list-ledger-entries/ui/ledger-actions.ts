import { softNavigate } from '@nba/ui';
import type { Transaction } from './ledger-types';
import { findAccount, type AccountLike } from '../../../shared/account-labels';

/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * L'adresse de la page était écrite en dur ici — ce qui liait ce module à l'écran qui
 * l'hébergeait, sans que rien ne le rappelle. Le jour où la page a cessé de porter un
 * gestionnaire `POST`, elle aurait répondu 404 sans que personne ne l'ait vu venir.
 */
const RELAIS = '/admin/api/accounting/ledger';

export interface TransactionFormValues {
  editingId: number | null;
  /**
   * Le virement parent quand on modifie une jambe : c'est lui que l'API corrige, entier. Une
   * jambe seule ne se modifie pas — un montant changé d'un côté seulement créerait de l'argent.
   */
  editingTransferId?: number | null;
  showPanel: 'recette' | 'depense' | 'transfert' | null;
  amount: string;
  date: string;
  category: string;
  formAccountId: string;
  destinationAccountId: string;
  /** Date de valeur au crédit du compte destinataire ; vide = le même jour que le débit. */
  destinationDate: string;
  paymentMethod: string;
  description: string;
  reference: string;
  accrualType: string;
  accrualNote: string;
  targetSeasonId: string;
  /**
   * L'adhésion rattachée, en chaîne comme le sélecteur la rend ; vide = écriture générale.
   * Une recette seulement : c'est elle qui compte pour le dossier de l'adhérent et
   * l'attestation. Une dépense ou un virement partent sans.
   */
  memberId?: string;
}

/**
 * Le formulaire vierge, pour une saisie neuve.
 *
 * Pendant de {@link editValuesFor}, et **écrit comme lui** : les deux rendent le même
 * objet complet. L'écran remettait ses champs à zéro un par un, et en avait déjà oublié
 * trois une première fois — comptes, moyen de paiement, catégorie, corrigés après coup —
 * puis `reference` une seconde : après avoir modifié une écriture, ouvrir une saisie
 * héritait de sa référence bancaire, qui partait en base sur la nouvelle et égarait le
 * rapprochement. Un champ ajouté au type oblige désormais les deux fonctions.
 */
export function newValuesFor(
  type: 'recette' | 'depense' | 'transfert',
  contexte: {
    mainAccountId: string;
    seasonId: string;
    /** Les comptes actifs : le destinataire d'un virement n'est jamais le compte de départ. */
    accounts?: readonly AccountLike[];
    paymentMethods?: readonly { code: string; kind?: string }[];
  }
): TransactionFormValues {
  const { mainAccountId, seasonId, accounts = [], paymentMethods = [] } = contexte;
  return {
    editingId: null,
    editingTransferId: null,
    showPanel: type,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '1',
    formAccountId: mainAccountId,
    destinationAccountId: accounts.find((a) => a.code !== mainAccountId)?.code ?? '',
    destinationDate: '',
    paymentMethod:
      paymentMethods.find((m) => m.kind === 'transfer')?.code ?? paymentMethods[0]?.code ?? '',
    description: '',
    reference: '',
    accrualType: 'normal',
    accrualNote: '',
    targetSeasonId: seasonId,
    memberId: ''
  };
}

/**
 * Ce qu'une écriture existante met dans le formulaire pour être modifiée.
 *
 * Une recette ou une dépense se recopie champ à champ. Un virement demande plus : la ligne
 * qu'on a sous la main n'est qu'une de ses deux jambes, et le formulaire veut le virement entier
 * — compte source, compte destinataire, date du débit, date du crédit. On les reconstitue depuis
 * la jambe et ce qu'elle sait de sa jumelle (`counterpartAccountId`, `counterpartDate`), que l'on
 * soit entré par le côté qui sort ou par celui qui reçoit.
 */
export function editValuesFor(
  tx: Pick<Transaction, 'id' | 'type' | 'accountId' | 'amount' | 'date' | 'paymentMethod' | 'description' | 'reference'> &
    Partial<Pick<Transaction, 'categoryId' | 'accrualType' | 'accrualNote' | 'memberId' | 'transferId' | 'transferLeg' | 'counterpartAccountId' | 'counterpartDate'>> & {
      // L'API projette l'identifiant numérique ; le grand livre le déclare en chaîne. Les deux passent.
      seasonId?: string | number | null;
    },
  accounts: readonly AccountLike[],
  fallback: { accountId: string; seasonId: string }
): TransactionFormValues {
  const codeOf = (id: number | string | null | undefined) => findAccount(accounts, id)?.code ?? '';
  const own = codeOf(tx.accountId) || fallback.accountId;
  const common = {
    editingId: tx.id,
    editingTransferId: tx.transferId ?? null,
    showPanel: tx.type,
    amount: (tx.amount / 100).toFixed(2),
    category: tx.categoryId ? String(tx.categoryId) : '1',
    paymentMethod: tx.paymentMethod,
    description: tx.description,
    reference: tx.reference || '',
    accrualType: tx.accrualType || 'normal',
    accrualNote: tx.accrualNote || '',
    targetSeasonId: tx.seasonId !== undefined && tx.seasonId !== null ? String(tx.seasonId) : fallback.seasonId,
    // L'adhérent déjà rattaché — au rapprochement, par un chèque — se garde à la modification.
    memberId: tx.memberId ? String(tx.memberId) : ''
  };

  if (tx.type !== 'transfert') {
    return { ...common, date: tx.date, formAccountId: own, destinationAccountId: '', destinationDate: '' };
  }

  const other = codeOf(tx.counterpartAccountId);
  const otherDate = tx.counterpartDate ?? tx.date;
  const [sourceDate, destinationDate] = tx.transferLeg === 'destination' ? [otherDate, tx.date] : [tx.date, otherDate];
  return {
    ...common,
    date: sourceDate,
    // La date de crédit ne s'affiche que distincte : vide, elle vaut celle du débit.
    destinationDate: destinationDate !== sourceDate ? destinationDate : '',
    formAccountId: tx.transferLeg === 'destination' ? other : own,
    destinationAccountId: tx.transferLeg === 'destination' ? own : other
  };
}

/** L'adhésion telle que l'API l'attend : un nombre, ou `null` pour une écriture générale. */
function memberIdFor(params: TransactionFormValues): number | null {
  if (params.showPanel !== 'recette' || !params.memberId) return null;
  const id = Number(params.memberId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function validateTransaction(params: TransactionFormValues): string | null {
  const floatAmount = parseFloat(params.amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    return 'Le montant doit être un nombre positif.';
  }
  if (params.showPanel === 'transfert') {
    if (!params.destinationAccountId || params.destinationAccountId === params.formAccountId) {
      return 'Le compte destinataire doit être différent du compte source.';
    }
    if (params.destinationDate && params.destinationDate < params.date) {
      return "L'argent ne peut pas arriver avant d'être parti : la date de crédit précède celle du débit.";
    }
  }
  return null;
}

export async function submitTransaction(params: TransactionFormValues): Promise<void> {
  const floatAmount = parseFloat(params.amount);

  /*
   * Un virement n'emprunte pas la même route qu'une recette : il écrit **deux** écritures, une
   * par compte, chacune avec sa date de valeur et son propre pointage bancaire. La route du grand
   * livre n'en écrit qu'une et refuse franchement le type `transfert` ; à la modification comme à
   * la saisie, c'est le virement entier qui part, désigné par son identifiant à lui.
   */
  if (params.showPanel === 'transfert') {
    if (params.editingId && !params.editingTransferId) {
      throw new Error('Cette jambe ne connaît pas son virement : rechargez la page avant de la modifier.');
    }
    const transfer = {
      seasonId: params.targetSeasonId,
      sourceAccountId: params.formAccountId,
      destinationAccountId: params.destinationAccountId,
      amountCents: Math.round(floatAmount * 100),
      sourceDate: params.date,
      destinationDate: params.destinationDate || params.date,
      description: params.description,
      reference: params.reference || null
    };
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        params.editingId
          ? { action: 'update-transfer', id: params.editingTransferId, ...transfer }
          : { action: 'create-transfer', ...transfer }
      )
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || json?.success === false) {
      throw new Error(json?.error || (params.editingId ? "Le virement n'a pas pu être modifié." : "Le virement n'a pas pu être enregistré."));
    }
    // La liste réaffichée doit se recaler sur la ligne que l'on vient de modifier.
    if (params.editingId) sessionStorage.setItem('scrollToTx', params.editingId.toString());
    return;
  }

  const payload = params.editingId
    ? {
        action: 'update',
        id: params.editingId,
        updates: {
          seasonId: params.targetSeasonId,
          type: params.showPanel,
          accountId: params.formAccountId,
          category: params.category,
          amount: Math.round(floatAmount * 100),
          date: params.date,
          paymentMethod: params.paymentMethod,
          description: params.description,
          reference: params.reference,
          accrualType: params.accrualType,
          accrualNote: params.accrualNote,
          memberId: memberIdFor(params)
        }
      }
    : {
        action: 'create',
        seasonId: params.targetSeasonId,
        type: params.showPanel,
        accountId: params.formAccountId,
        category: params.category,
        amount: Math.round(floatAmount * 100),
        date: params.date,
        paymentMethod: params.paymentMethod,
        description: params.description,
        reference: params.reference,
        accrualType: params.accrualType,
        accrualNote: params.accrualNote,
        memberId: memberIdFor(params)
      };

  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errStr = await res.text();
    try {
      const parsed = JSON.parse(errStr);
      if (parsed.error) errStr = parsed.error;
    } catch(e){}
    throw new Error(errStr || 'Impossible d\'enregistrer la transaction');
  }
  
  // La liste réaffichée doit se recaler sur la ligne que l'on vient de modifier.
  if (params.editingId) {
    sessionStorage.setItem('scrollToTx', params.editingId.toString());
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (!res.ok) {
    let errStr = await res.text();
    try {
      const parsed = JSON.parse(errStr);
      if (parsed.error) errStr = parsed.error;
    } catch(e){}
    throw new Error(errStr || 'Impossible de supprimer.');
  }
}

export function changePage(newPage: number, totalPages: number) {
  if (newPage < 1 || newPage > totalPages) return;
  const params = new URLSearchParams(window.location.search);
  params.set('page', newPage.toString());
  softNavigate(`/admin/accounting?${params.toString()}`);
}

export function applySeasonChange(selectedSeason: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('season', selectedSeason);
  params.set('page', '1');
  softNavigate(`/admin/accounting?${params.toString()}`);
}
