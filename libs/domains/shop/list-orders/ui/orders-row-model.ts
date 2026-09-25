import { Banknote, Check, Pencil, Undo2, X } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import type { OrderItem, OrderStatus, Season } from './orders-manager-types';

/**
 * Le vocabulaire de l'écran des commandes, en un seul endroit.
 *
 * Libellés d'étape, libellés d'action, tons, mise en forme des montants et des
 * dates : la vue tableau et la vue liste les lisaient chacune dans son markup, avec
 * déjà deux variantes de badge pour un même statut et deux formats de date pour une
 * même commande. Tout ce qui se lit à l'écran passe désormais par ici, et se teste
 * sans monter de composant.
 */

/**
 * Ce qui identifie une saison hors de la base : son code.
 *
 * Même repli que `toSeasonOptions`, pour que les options du filtre et la saison
 * courante se comparent sur la même clé — elles ne le faisaient pas, et le filtre
 * restait vide pendant que la clôture passait inaperçue.
 */
export const codeDeSaison = (s: Season): string => String(s.code ?? s.id);

/** Une commande encore ouverte est à l'une de ses deux étapes. */
export type EtapeOuverte = 'created' | 'awaiting_payment';

export const ETAPE_LABELS: Record<EtapeOuverte, string> = {
  created: 'À valider',
  awaiting_payment: 'En attente de paiement'
};

/**
 * Le couple d'actions de chaque étape.
 *
 * La **primaire** est réversible — une commande validée s'annule, un encaissement se
 * défait — et c'est elle qui vient en tête : le balayage long l'exécute, et ce geste
 * est trop facile à déclencher par mégarde pour porter une issue définitive.
 */
export const ACTION_LABELS: Record<EtapeOuverte, { primaire: string; secondaire: string }> = {
  created: { primaire: 'Valider', secondaire: 'Refuser' },
  awaiting_payment: { primaire: 'Encaisser', secondaire: 'Annuler' }
};

/** L'étape d'une commande ouverte ; `created` pour tout ce qui n'attend pas de règlement. */
export const etapeOuverte = (item: OrderItem): EtapeOuverte =>
  item.order.status === 'awaiting_payment' ? 'awaiting_payment' : 'created';

export const estOuverte = (item: OrderItem): boolean =>
  item.order.status === 'created' || item.order.status === 'awaiting_payment';

/** Les issues closes, et ce qu'elles valent à l'écran. */
const ISSUES: Partial<Record<OrderStatus, { label: string; variant: string }>> = {
  paid: { label: 'Payée', variant: 'success' },
  rejected: { label: 'Refusée', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' }
};

export const issueCommande = (item: OrderItem): { label: string; variant: string } | null =>
  ISSUES[item.order.status] ?? null;

/**
 * Le montant en centimes, quelle que soit la forme que le relais a servie.
 *
 * `totalAmountCents` est la forme d'aujourd'hui ; `totalAmount` celle d'avant, encore
 * lue par prudence. Le choix se faisait jusqu'ici dans le markup, à trois endroits.
 */
export const montantCents = (item: OrderItem): number =>
  (item.order as { totalAmountCents?: number }).totalAmountCents ?? item.order.totalAmount;

export const nomAdherent = (item: OrderItem): string =>
  item.member ? `${item.member.lastName} ${item.member.firstName}` : 'Adhérent inconnu';

/** « 2 × Volants Mavis 350 » — ce qui a été commandé, et combien. */
export const articleCommande = (item: OrderItem): string => {
  const nom = item.product?.name ?? 'Produit supprimé';
  return `${item.order.quantity} × ${nom}`;
};

export function dateFr(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

/**
 * Le nombre de jours d'attente d'un règlement.
 *
 * Au-delà de sept, la commande entre dans le périmètre de la relance hebdomadaire :
 * c'est le seul seuil qui compte, et c'est celui que la ligne signale.
 */
export function joursDAttente(since: string | null): number | null {
  if (!since) return null;
  const d = new Date(since);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export const SEUIL_RELANCE = 7;

export const enRetard = (item: OrderItem): number | null => {
  if (item.order.status !== 'awaiting_payment') return null;
  const jours = joursDAttente(item.order.awaitingPaymentSince);
  return jours !== null && jours >= SEUIL_RELANCE ? jours : null;
};

export type LigneCommande = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
  legende: string;
};

/**
 * Projection d'une commande en ligne de liste.
 *
 * L'adhérent identifie la commande — c'est de lui qu'on parle quand on valide —,
 * l'article et sa quantité disent de quoi il s'agit, le montant est la seule valeur
 * qui compte à droite, et la date situe. Tout le reste — moyen de paiement, date de
 * mise en attente, référence de l'écriture — vit sur la fiche, à un appui.
 *
 * Le montant s'éteint sur une commande refusée ou annulée : l'argent n'a pas bougé,
 * et une somme en pleine couleur laissait croire le contraire.
 */
export function ligneCommande(item: OrderItem): LigneCommande {
  const close = item.order.status === 'rejected' || item.order.status === 'cancelled';
  return {
    titre: nomAdherent(item),
    sousTitre: articleCommande(item),
    valeur: formatAmount(montantCents(item)),
    ton: close ? 'muted' : 'foreground',
    legende: dateFr(item.order.createdAt)
  };
}

/** Les fonctions de transition que l'écran met à disposition d'une ligne. */
export type TransitionsDeCommande = {
  /** Saison clôturée, ou transition déjà en vol : plus aucune action n'est offerte. */
  verrouille?: boolean;
  onPrimary?: (id: number) => void;
  onSecondary?: (id: number) => void;
  onUnpay?: (id: number) => void;
  /**
   * Corriger la commande (adhérent, article, quantité, règlement), tant qu'elle est ouverte.
   * Offert au menu du tableau ; la liste au doigt le porte dans la fiche, pas au balayage.
   */
  onEdit?: (item: OrderItem) => void;
};

/**
 * Ce qu'on peut faire d'une commande, dans l'ordre, déclaré une seule fois.
 *
 * Le tableau de bureau et la liste au doigt le rendent tous les deux — le premier en
 * items de menu, la seconde en actions de balayage — d'où cette déclaration en
 * données plutôt qu'en markup : les deux menus s'écrivaient à la main, et le menu du
 * tableau connaissait déjà une action que les cartes mobiles n'offraient pas.
 *
 * La **première** est celle qu'un balayage long exécute : toujours la réversible.
 * Aucune ne porte de `confirm` — refuser, annuler et défaire un encaissement posent
 * déjà leur question dans `orders-manager-actions`, et la doubler ferait répondre
 * deux fois à la même chose.
 */
export function actionsDeCommande(
  item: OrderItem,
  { verrouille = false, onPrimary, onSecondary, onUnpay, onEdit }: TransitionsDeCommande
): SwipeAction<OrderItem>[] {
  if (verrouille) return [];

  if (item.order.status === 'paid') {
    if (!onUnpay) return [];
    return [
      {
        id: 'unpay',
        label: "Annuler l'encaissement",
        icon: Undo2,
        tone: 'destructive',
        run: (x) => onUnpay(x.order.id)
      }
    ];
  }

  // Refusée ou annulée : une issue close ne se rouvre pas.
  if (!estOuverte(item) || !onPrimary || !onSecondary) return [];

  const etape = etapeOuverte(item);
  // En dernier : la première action est celle d'un balayage long, et elle doit rester réversible.
  const corriger: SwipeAction<OrderItem>[] = onEdit
    ? [{ id: 'modifier', label: 'Modifier', icon: Pencil, tone: 'neutral', run: (x) => onEdit(x) }]
    : [];
  return [
    {
      id: 'primaire',
      label: ACTION_LABELS[etape].primaire,
      icon: etape === 'created' ? Check : Banknote,
      tone: 'primary',
      run: (x) => onPrimary(x.order.id)
    },
    {
      id: 'secondaire',
      label: ACTION_LABELS[etape].secondaire,
      icon: X,
      tone: 'destructive',
      run: (x) => onSecondary(x.order.id)
    },
    ...corriger
  ];
}
