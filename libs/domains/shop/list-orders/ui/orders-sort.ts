import type { OrderItem } from './orders-manager-types';
import { etapeOuverte, ETAPES_OUVERTES, montantCents, nomAdherent } from './orders-row-model';

/**
 * Le tri des tableaux de commandes, au clic sur un en-tête.
 *
 * Un premier clic trie par ordre croissant, chaque clic suivant inverse le sens. Changer
 * de colonne repart en croissant. Sans tri choisi, les lignes gardent l'ordre servi par
 * l'API.
 */
export type ColonneTri = 'date' | 'adherent' | 'produit' | 'quantite' | 'statut' | 'attente' | 'reglement' | 'montant';

export type Tri = { colonne: ColonneTri; sens: 'asc' | 'desc' } | null;

const COLONNES: readonly ColonneTri[] = ['date', 'adherent', 'produit', 'quantite', 'statut', 'attente', 'reglement', 'montant'];

/**
 * Le tri tel qu'il s'écrit dans l'URL : `produit`, ou `-produit` en décroissant.
 *
 * Il y vit avec les autres critères de l'écran : chaque décision recharge la page, et un
 * tri gardé en mémoire repartait à zéro à chaque commande validée ou encaissée.
 */
export const triVersUrl = (tri: Tri): string => (tri ? `${tri.sens === 'desc' ? '-' : ''}${tri.colonne}` : '');

/** L'inverse de `triVersUrl` ; une valeur inconnue donne l'ordre servi par l'API. */
export function triDepuisUrl(valeur: string | null): Tri {
  if (!valeur) return null;
  const sens = valeur.startsWith('-') ? 'desc' : 'asc';
  const colonne = valeur.replace(/^-/, '') as ColonneTri;
  return COLONNES.includes(colonne) ? { colonne, sens } : null;
}

/** Le tri après un clic sur `colonne`. */
export const basculerTri = (tri: Tri, colonne: ColonneTri): Tri =>
  tri?.colonne === colonne
    ? { colonne, sens: tri.sens === 'asc' ? 'desc' : 'asc' }
    : { colonne, sens: 'asc' };

/** Le sens à afficher sur l'en-tête de `colonne`. */
export const sensDe = (tri: Tri, colonne: ColonneTri): 'asc' | 'desc' | null =>
  tri?.colonne === colonne ? tri.sens : null;

const horodatage = (v: string | Date | null | undefined): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
};

/** Rang d'un statut : l'ordre du parcours, puis les issues closes. */
const rangStatut = (item: OrderItem): number => {
  const i = ETAPES_OUVERTES.indexOf(item.order.status as never);
  if (i >= 0) return i;
  return ETAPES_OUVERTES.length + (['delivered', 'rejected', 'cancelled'].indexOf(item.order.status) + 1);
};

/** La clé de comparaison d'une ligne pour une colonne ; `null` passe toujours en dernier. */
function cle(item: OrderItem, colonne: ColonneTri): string | number | null {
  switch (colonne) {
    case 'date':
      return horodatage(item.order.createdAt);
    case 'adherent':
      return item.member ? nomAdherent(item) : null;
    case 'produit':
      return item.product?.name ?? null;
    case 'quantite':
      return item.order.quantity;
    case 'statut':
      return rangStatut(item);
    case 'attente':
      return etapeOuverte(item) === 'awaiting_payment' ? horodatage(item.order.awaitingPaymentSince) : null;
    case 'reglement':
      return item.order.paymentMethodLabel || item.order.paymentMethod || null;
    case 'montant':
      return montantCents(item);
  }
}

/** Les lignes triées, sans toucher au tableau reçu. Les valeurs absentes restent en bas. */
export function trierCommandes(items: OrderItem[], tri: Tri): OrderItem[] {
  if (!tri) return items;
  const signe = tri.sens === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const ka = cle(a, tri.colonne);
    const kb = cle(b, tri.colonne);
    if (ka === null || kb === null) return ka === kb ? 0 : ka === null ? 1 : -1;
    const ecart =
      typeof ka === 'number' && typeof kb === 'number'
        ? ka - kb
        : String(ka).localeCompare(String(kb), 'fr', { sensitivity: 'base', numeric: true });
    return ecart * signe;
  });
}
