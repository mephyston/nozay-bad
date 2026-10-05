import { Banknote, Check, PackageCheck, Pencil, Undo2, X } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import type { OrderItem, OrderStatus, Season } from './orders-manager-types';
import { VARIANT_SEPARATOR } from '../../shared/product';

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

/**
 * Une commande encore ouverte est à l'une de ses trois étapes.
 *
 * Payée, elle reste ouverte tant que l'article n'est pas remis : c'est ce qui dit au
 * bureau ce qu'il lui reste à distribuer.
 */
export type EtapeOuverte = 'created' | 'awaiting_payment' | 'paid';

/** L'ordre du parcours : on valide, on encaisse, on remet. */
export const ETAPES_OUVERTES: readonly EtapeOuverte[] = ['created', 'awaiting_payment', 'paid'];

/**
 * Le nom de chaque étape : celui de l'état du workflow, le même dans le badge d'une
 * ligne et dans le filtre qui la sélectionne.
 */
export const ETAPE_LABELS: Record<EtapeOuverte, string> = {
  created: 'Nouvelle',
  awaiting_payment: 'En attente de paiement',
  paid: 'Payée'
};

export const ETAPE_VARIANTS: Record<EtapeOuverte, string> = {
  created: 'warning',
  awaiting_payment: 'secondary',
  paid: 'success'
};

/**
 * Le couple d'actions de chaque étape.
 *
 * La **primaire** est réversible — une commande validée s'annule, un encaissement se
 * défait, une remise aussi — et c'est elle qui vient en tête : le balayage long l'exécute, et ce geste
 * est trop facile à déclencher par mégarde pour porter une issue définitive.
 */
export const ACTION_LABELS: Record<EtapeOuverte, { primaire: string; secondaire: string }> = {
  created: { primaire: 'Valider', secondaire: 'Refuser' },
  awaiting_payment: { primaire: 'Encaisser', secondaire: 'Annuler' },
  paid: { primaire: 'Livrer', secondaire: "Annuler l'encaissement" }
};

/**
 * Les deux droits qui gouvernent les transitions. `decider` (`shop:orders:approve`) :
 * valider, refuser, annuler, livrer. `encaisser` (`shop:payments:write`) : encaisser et
 * défaire l'encaissement, qui écrivent au grand livre et restent à la trésorerie.
 */
export type DroitsCommande = { decider: boolean; encaisser: boolean };

const TOUS_DROITS: DroitsCommande = { decider: true, encaisser: true };

/** Le droit qu'exige chaque action de chaque étape. */
const DROIT_REQUIS: Record<EtapeOuverte, Record<'primaire' | 'secondaire', keyof DroitsCommande>> = {
  created: { primaire: 'decider', secondaire: 'decider' },
  awaiting_payment: { primaire: 'encaisser', secondaire: 'decider' },
  paid: { primaire: 'decider', secondaire: 'encaisser' }
};

/** L'action est-elle offerte à qui porte ces droits ? */
export const actionPermise = (
  etape: EtapeOuverte,
  cote: 'primaire' | 'secondaire',
  droits: DroitsCommande = TOUS_DROITS
): boolean => droits[DROIT_REQUIS[etape][cote]];

export const estOuverte = (item: OrderItem): boolean =>
  (ETAPES_OUVERTES as readonly string[]).includes(item.order.status);

/** L'étape d'une commande ouverte ; `created` pour tout ce qui n'en a pas. */
export const etapeOuverte = (item: OrderItem): EtapeOuverte =>
  estOuverte(item) ? (item.order.status as EtapeOuverte) : 'created';

/** Les issues closes, et ce qu'elles valent à l'écran. */
const ISSUES: Partial<Record<OrderStatus, { label: string; variant: string }>> = {
  delivered: { label: 'Livrée', variant: 'success' },
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

export const ICONES_PRIMAIRES = { created: Check, awaiting_payment: Banknote, paid: PackageCheck } as const;

/** Les fonctions de transition que l'écran met à disposition d'une ligne. */
export type TransitionsDeCommande = {
  /** Saison clôturée, ou transition déjà en vol : plus aucune action n'est offerte. */
  verrouille?: boolean;
  onPrimary?: (id: number) => void;
  onSecondary?: (id: number) => void;
  /** Défaire une remise cochée par erreur : seule action d'une commande livrée. */
  onUndeliver?: (id: number) => void;
  /**
   * Corriger la commande (adhérent, article, quantité, règlement), tant qu'elle est ouverte.
   * Offert au menu du tableau ; la liste au doigt le porte dans la fiche, pas au balayage.
   */
  onEdit?: (item: OrderItem) => void;
  /** Ce que l'utilisateur a le droit de faire ; tout, par défaut. */
  droits?: DroitsCommande;
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
  { verrouille = false, onPrimary, onSecondary, onUndeliver, onEdit, droits = TOUS_DROITS }: TransitionsDeCommande
): SwipeAction<OrderItem>[] {
  if (verrouille) return [];

  if (item.order.status === 'delivered') {
    if (!onUndeliver || !droits.decider) return [];
    return [
      {
        id: 'undeliver',
        label: 'Annuler la remise',
        icon: Undo2,
        tone: 'destructive',
        run: (x) => onUndeliver(x.order.id)
      }
    ];
  }

  // Refusée ou annulée : une issue close ne se rouvre pas.
  if (!estOuverte(item) || !onPrimary || !onSecondary) return [];

  const etape = etapeOuverte(item);
  // En dernier : la première action est celle d'un balayage long, et elle doit rester réversible.
  // Une commande payée ne se corrige plus : sa recette est écrite.
  const corriger: SwipeAction<OrderItem>[] = onEdit && etape !== 'paid'
    ? [{ id: 'modifier', label: 'Modifier', icon: Pencil, tone: 'neutral', run: (x) => onEdit(x) }]
    : [];
  // Sans le droit d'encaisser, « Encaisser » disparaît : « Annuler » prend la tête, et
  // pose sa question avant d'agir.
  const primaire: SwipeAction<OrderItem>[] = actionPermise(etape, 'primaire', droits)
    ? [{
        id: 'primaire',
        label: ACTION_LABELS[etape].primaire,
        icon: ICONES_PRIMAIRES[etape],
        tone: 'primary',
        run: (x) => onPrimary(x.order.id)
      }]
    : [];
  const secondaire: SwipeAction<OrderItem>[] = actionPermise(etape, 'secondaire', droits)
    ? [{
        id: 'secondaire',
        label: ACTION_LABELS[etape].secondaire,
        icon: etape === 'paid' ? Undo2 : X,
        tone: 'destructive',
        run: (x) => onSecondary(x.order.id)
      }]
    : [];
  return [...primaire, ...secondaire, ...corriger];
}

/**
 * L'article d'une commande, taille comprise ou non.
 *
 * Filtrer par article sert à suivre une opération — les maillots, par exemple — et non
 * une taille : les déclinaisons se rangent donc sous leur parent. L'API sert le nom
 * déjà suffixé de la taille (« Maillot du club — L ») ; on le lui retire.
 */
export function articleDeCommande(item: OrderItem): { value: string; label: string } | null {
  const p = item.product;
  if (!p) return null;
  const taille = p.variantLabel?.trim();
  const suffixe = taille ? `${VARIANT_SEPARATOR}${taille}` : '';
  const nom = suffixe && p.name.endsWith(suffixe) ? p.name.slice(0, -suffixe.length) : p.name;
  return { value: String(p.parentId ?? p.id), label: nom };
}

/** Les articles effectivement commandés, un par parent, dans l'ordre alphabétique. */
export function articlesCommandes(items: OrderItem[]): { value: string; label: string }[] {
  const parArticle = new Map<string, string>();
  for (const item of items) {
    const article = articleDeCommande(item);
    if (article && !parArticle.has(article.value)) parArticle.set(article.value, article.label);
  }
  return [...parArticle]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Le statut en toutes lettres, pour un fichier qu'on ouvre hors de l'écran. */
const STATUT_EXPORT: Record<OrderStatus, string> = {
  created: 'Nouvelle',
  awaiting_payment: 'En attente de paiement',
  paid: 'Payée',
  delivered: 'Livrée',
  rejected: 'Refusée',
  cancelled: 'Annulée'
};

const cellule = (valeur: string | number | null | undefined) =>
  `"${String(valeur ?? '').replace(/"/g, '""')}"`;

/**
 * Les commandes affichées, en CSV : qui a commandé quoi, et comment le joindre.
 *
 * L'export reprend **la vue courante**, filtres compris : filtrer l'article « Maillot du
 * club » puis exporter donne la liste de l'opération, taille par taille, à transmettre
 * au fournisseur ou à qui distribue. Conventions du tableur français, comme l'export
 * des adhérents : `;` en séparateur, guillemets doublés ; l'indicateur d'ordre des
 * octets est ajouté au téléchargement.
 */
export function commandesCsv(items: OrderItem[]): string {
  const lignes = ['Nom;Prénom;Email;Article;Quantité;Montant;Statut;Date'];
  for (const item of items) {
    lignes.push(
      [
        cellule(item.member?.lastName),
        cellule(item.member?.firstName),
        cellule(item.member?.email?.trim()),
        cellule(item.product?.name ?? 'Produit supprimé'),
        cellule(item.order.quantity),
        cellule((montantCents(item) / 100).toFixed(2).replace('.', ',')),
        cellule(STATUT_EXPORT[item.order.status] ?? item.order.status),
        cellule(dateFr(item.order.createdAt))
      ].join(';')
    );
  }
  return lignes.join('\n') + '\n';
}
