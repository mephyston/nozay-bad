import { Ban, CheckCircle2, Edit, Printer, Send, Trash2 } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import type { Invoice } from './invoices-types';

/**
 * Le vocabulaire des factures, en un seul endroit.
 *
 * Les libellés de statut et leurs couleurs vivaient dans deux tables posées au milieu
 * d'une ligne de tableau, et la liste des actions dans une cascade de `{#if}` par
 * statut — introuvable, intestable, et impossible à servir à une autre présentation.
 */

export type StatutFacture = 'draft' | 'sent' | 'paid' | 'cancelled';

const STATUTS: Record<StatutFacture, { label: string; variant: string; ton: Tone }> = {
  draft: { label: 'Brouillon', variant: 'outline', ton: 'muted' },
  sent: { label: 'En attente de règlement', variant: 'info', ton: 'foreground' },
  paid: { label: 'Payée', variant: 'success', ton: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive', ton: 'muted' }
};

export const statutDeFacture = (inv: Pick<Invoice, 'status'>) =>
  STATUTS[inv.status as StatutFacture] ?? { label: inv.status, variant: 'outline', ton: 'muted' as Tone };

export const montantCents = (inv: Invoice): number =>
  (inv as { totalAmountCents?: number }).totalAmountCents ?? inv.totalAmount;

export type LigneDeFacture = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'une facture en ligne de liste.
 *
 * Le client identifie — c'est de lui qu'on parle —, le numéro et la date situent, le
 * montant est la seule valeur qui compte à droite. Le statut se dit par un badge : ici
 * il n'y a pas d'état « courant » qui rendrait le signal muet, les quatre comptent.
 *
 * Le montant s'éteint sur une facture annulée : rien n'a été encaissé, et une somme en
 * pleine couleur laisse croire le contraire.
 */
export function ligneDeFacture(inv: Invoice): LigneDeFacture {
  return {
    titre: inv.clientName,
    sousTitre: `${inv.invoiceNumber} · ${inv.date}`,
    valeur: formatAmount(montantCents(inv)),
    ton: statutDeFacture(inv).ton
  };
}

export type GestesDeFacture = {
  isClosed?: boolean;
  onPrint: (id: number) => void;
  onEdit: (inv: Invoice) => void;
  onStatusChange: (id: number, status: 'sent' | 'paid' | 'cancelled') => void;
  onDelete: (id: number, invoiceNumber: string) => void;
};

/**
 * Ce qu'on peut faire d'une facture, selon où elle en est.
 *
 * L'**avancement** vient en tête : c'est le geste courant, celui qu'un balayage long
 * exécute, et il est réversible — une facture marquée payée se remet en attente par
 * l'écran qui l'a changée. Annuler et supprimer portent leur question ; c'est
 * `runAction` qui la pose, la même pour le balayage, le menu de la liste et celui du
 * tableau. Elle remplace deux boîtes de dialogue que l'écran portait à la main.
 *
 * Imprimer reste offert quel que soit le statut : une facture annulée se réimprime.
 */
export function gestesDeFacture(inv: Invoice, gestes: GestesDeFacture): SwipeAction<Invoice>[] {
  const liste: SwipeAction<Invoice>[] = [];

  if (!gestes.isClosed) {
    if (inv.status === 'draft') {
      liste.push({
        id: 'envoyer',
        label: 'Marquer en attente de règlement',
        icon: Send,
        tone: 'primary',
        run: (x) => gestes.onStatusChange(x.id, 'sent')
      });
      liste.push({ id: 'modifier', label: 'Modifier', icon: Edit, run: (x) => gestes.onEdit(x) });
    }
    if (inv.status === 'sent') {
      liste.push({
        id: 'payee',
        label: 'Marquer comme payée',
        icon: CheckCircle2,
        tone: 'primary',
        run: (x) => gestes.onStatusChange(x.id, 'paid')
      });
    }
  }

  liste.push({ id: 'imprimer', label: 'Imprimer', icon: Printer, run: (x) => gestes.onPrint(x.id) });

  if (!gestes.isClosed) {
    if (inv.status === 'draft' || inv.status === 'sent') {
      liste.push({
        id: 'annuler',
        label: 'Annuler la facture',
        icon: Ban,
        tone: 'destructive',
        confirm: `Annuler la facture ${inv.invoiceNumber} ?`,
        run: (x) => gestes.onStatusChange(x.id, 'cancelled')
      });
    }
    if (inv.status === 'draft' || inv.status === 'cancelled') {
      liste.push({
        id: 'supprimer',
        label: 'Supprimer',
        icon: Trash2,
        tone: 'destructive',
        confirm: `Supprimer définitivement la facture ${inv.invoiceNumber} ? Cette action est sans retour.`,
        run: (x) => gestes.onDelete(x.id, x.invoiceNumber)
      });
    }
  }

  return liste;
}
