import { Ban, Pencil, RotateCcw } from '@lucide/svelte';
import { accorder, jourCourt, type SwipeAction, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des soirées d'indiv.
 *
 * Sept colonnes sur un tableau, trois sur une ligne de téléphone. Ce qui tombe —
 * le découpage en créneaux, le détail des candidats — vit sur l'écran de sélection,
 * où il y a la place de lire l'âge, le classement et l'historique de chacun.
 */

export type SoireeLike = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  venue: { name: string } | null;
  slotCount: number;
  capacityPerSlot: number;
  status: 'open' | 'announced' | 'cancelled';
  label: string | null;
  requestCount: number;
  selectedCount: number;
};

/** L'identité d'une soirée : son jour, et son intitulé quand elle en porte un. */
export const titreDeSoiree = (s: SoireeLike): string =>
  s.label?.trim() ? `${jourCourt(s.date)} · ${s.label.trim()}` : jourCourt(s.date);

/** Sous le titre : l'horaire et le gymnase. */
export const detailDeSoiree = (s: SoireeLike): string =>
  `${s.startTime}–${s.endTime} · ${s.venue?.name ?? 'Gymnase inconnu'}`;

/** Le nombre de places de la soirée : autant de créneaux que de places par créneau. */
export const placesDeSoiree = (s: SoireeLike): number => s.slotCount * s.capacityPerSlot;

/**
 * La valeur qui compte à droite : combien sont retenus sur combien de places.
 *
 * Et non le nombre de candidats, qui est la donnée d'entrée : ce qu'on vient vérifier
 * est l'état du remplissage, pas l'affluence.
 */
export const remplissageDeSoiree = (s: SoireeLike): string =>
  `${s.selectedCount}/${placesDeSoiree(s)}`;

/** Sous le remplissage, l'affluence — ce à quoi le remplissage répond. */
export const candidaturesDeSoiree = (s: SoireeLike): string =>
  `${s.requestCount} ${accorder(s.requestCount, 'candidat')}`;

/** Une soirée complète est au vert ; une annulée ne dit plus rien de son remplissage. */
export const tonDeRemplissage = (s: SoireeLike): Tone => {
  if (s.status === 'cancelled') return 'muted';
  return s.selectedCount >= placesDeSoiree(s) ? 'success' : 'muted';
};

/**
 * Une soirée attend-elle encore son annonce ?
 *
 * C'est la seule question que l'entraîneur pose à cet écran : les candidatures sont
 * ouvertes, la date n'est pas passée, et personne n'a encore été prévenu.
 */
export const resteAAnnoncer = (s: SoireeLike, aujourdhui: string): boolean =>
  s.status === 'open' && s.date >= aujourdhui;

export type EtatDeSoiree = {
  texte: string;
  variante: 'destructive' | 'primary-soft' | 'secondary' | 'outline';
  /** Vrai quand l'état réclame un geste : c'est lui seul qui se badge sur téléphone. */
  exception: boolean;
};

/**
 * L'état d'une soirée, dans un vocabulaire unique.
 *
 * Le tableau disait « Candidatures ouvertes » là où la liste aurait dit « À annoncer » :
 * deux mots pour le même état, et c'est ainsi que les libellés des adhérents ont
 * divergé entre leurs deux vues. Une seule déclaration, deux usages — la colonne du
 * tableau la rend toujours, la pastille du téléphone seulement quand elle est une
 * exception.
 */
export const etatDeSoiree = (s: SoireeLike, aujourdhui: string): EtatDeSoiree => {
  if (s.status === 'cancelled')
    return { texte: 'Annulée', variante: 'destructive', exception: true };
  if (s.status === 'announced')
    return { texte: 'Annoncée', variante: 'primary-soft', exception: false };
  if (resteAAnnoncer(s, aujourdhui))
    return { texte: 'À annoncer', variante: 'destructive', exception: true };
  return { texte: 'Passée', variante: 'secondary', exception: false };
};

/**
 * La pastille, et seulement pour une exception.
 *
 * Le tableau badgeait les quatre états, donc chaque rangée, donc plus rien. Une soirée
 * annoncée ou passée n'appelle aucun geste : son silence est l'information.
 */
export const pastilleDeSoiree = (s: SoireeLike, aujourdhui: string): EtatDeSoiree | undefined => {
  const etat = etatDeSoiree(s, aujourdhui);
  return etat.exception ? etat : undefined;
};

/** Clé de regroupement : le mois. */
export const moisDeSoiree = (s: SoireeLike): string => s.date.slice(0, 7);

export type DroitsSurSoirees = { canWrite?: boolean };

export type GestesDeSoiree = {
  onEdit: (s: SoireeLike) => void;
  onCancel: (s: SoireeLike) => void;
  onReopen: (s: SoireeLike) => void;
};

/**
 * Ce qu'on peut faire d'une soirée, hors la consulter.
 *
 * Consulter n'est pas dans cette liste : les candidats vivent sur **une autre page**,
 * c'est donc l'appui sur la ligne qui y mène — un chevron promet un ailleurs, et
 * l'offrir aussi au balayage coûterait une rangée pour ne rien ajouter.
 *
 * Ni l'annulation ni la réouverture ne portent de `confirm` : la première ouvre un
 * formulaire qui réclame un motif que les candidats liront, la seconde pose déjà sa
 * question — et la sienne dit ce qu'il advient des retenus.
 */
export function gestesDeSoiree(
  s: SoireeLike,
  droits: DroitsSurSoirees,
  gestes: GestesDeSoiree
): SwipeAction<SoireeLike>[] {
  if (!droits.canWrite) return [];
  return [
    { id: 'modifier', label: 'Modifier', icon: Pencil, run: (x) => gestes.onEdit(x) },
    s.status === 'cancelled'
      ? { id: 'sort', label: 'Rouvrir', icon: RotateCcw, run: (x) => gestes.onReopen(x) }
      : {
          id: 'sort',
          label: 'Annuler la soirée',
          icon: Ban,
          tone: 'destructive' as const,
          run: (x) => gestes.onCancel(x)
        }
  ];
}
