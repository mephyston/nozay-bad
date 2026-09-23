import { CalendarDays, Pencil, Trash2, Users } from '@lucide/svelte';
import { accorder, type SwipeAction, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des équipes engagées.
 *
 * Huit colonnes sur un tableau. Sur une ligne de téléphone : le nom identifie, le
 * championnat et la division situent, l'effectif tient la droite. Le capitaine, le
 * vice-capitaine, la poule et le nombre de matchs se lisent dans la feuille de
 * l'équipe — c'est elle qu'ouvre l'appui.
 */

export type EquipeLike = {
  id: number;
  name: string;
  championshipLabel: string;
  divisionLabel: string;
  poolLabel?: string | null;
  captain: { firstName: string; lastName: string } | null;
  viceCaptain: { firstName: string; lastName: string } | null;
  rosterCount: number;
  matchCount: number;
  active: boolean;
};

/** Le nom d'une personne du staff, ou un tiret : son absence est une information. */
export const nomDeStaff = (
  personne: { firstName: string; lastName: string } | null | undefined
): string => (personne ? `${personne.lastName} ${personne.firstName}`.trim() : '—');

/** Sous le nom de l'équipe : où elle joue. */
export const detailDEquipe = (e: EquipeLike): string =>
  e.poolLabel
    ? `${e.championshipLabel} · ${e.divisionLabel} · ${e.poolLabel}`
    : `${e.championshipLabel} · ${e.divisionLabel}`;

/** La valeur qui compte à droite : l'effectif. */
export const effectifDEquipe = (e: EquipeLike): string => String(e.rosterCount);

/** « joueur » / « joueurs », et le singulier à zéro. */
export const legendeDEffectif = (e: EquipeLike): string =>
  accorder(e.rosterCount, 'joueur');

/**
 * Une équipe sans personne n'est pas une alerte, c'est une équipe qu'on vient de créer.
 * Le manque se dit dans la pastille, pas par une couleur sur le compte.
 */
export const tonDEffectif = (e: EquipeLike): Tone => (e.rosterCount > 0 ? 'foreground' : 'muted');

/**
 * Les pastilles, et seulement pour les exceptions.
 *
 * Une équipe active et pourvue de son capitaine est le cas courant : elle ne se
 * signale pas. Le vice-capitaine, lui, ne se badge jamais — beaucoup d'équipes n'en
 * ont pas, et ce n'est pas un manque.
 *
 * « Sans capitaine » et non « Non désigné » comme dans le tableau : là-bas, la colonne
 * s'appelle « Capitaine » et fournit le sujet ; ici la pastille est seule et doit le
 * porter. Ce n'est pas une divergence de vocabulaire mais la même chose dite dans deux
 * contextes, dont l'un n'annonce rien.
 */
export const signalementsDEquipe = (
  e: EquipeLike
): { label: string; variant: 'outline' | 'warning' }[] => {
  const liste: { label: string; variant: 'outline' | 'warning' }[] = [];
  if (!e.active) liste.push({ label: 'Inactive', variant: 'outline' });
  if (!e.captain) liste.push({ label: 'Sans capitaine', variant: 'warning' });
  return liste;
};

export type DroitsSurEquipes = { canWrite?: boolean; canDelete?: boolean };

export type GestesDEquipe = {
  onRoster: (e: EquipeLike) => void;
  onFixtures: (e: EquipeLike) => void;
  onEdit: (e: EquipeLike) => void;
  onDelete: (e: EquipeLike) => void;
};

/**
 * Ce qu'on peut faire d'une équipe.
 *
 * Les rencontres viennent en tête : c'est le geste le plus fréquent après la
 * consultation de l'effectif, et il ne change rien — or la première action déclarée
 * est celle qu'un balayage long exécute.
 *
 * La suppression ne porte pas de question ici : l'écran en pose une, et la sienne
 * énumère ce qui part avec l'équipe — staff, effectif, rencontres et compositions
 * déjà saisies. Une formule générique tairait tout cela.
 */
export function gestesDEquipe(
  droits: DroitsSurEquipes,
  gestes: GestesDEquipe
): SwipeAction<EquipeLike>[] {
  const liste: SwipeAction<EquipeLike>[] = [
    { id: 'rencontres', label: 'Rencontres', icon: CalendarDays, tone: 'primary', run: (e) => gestes.onFixtures(e) }
  ];
  if (droits.canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Pencil, run: (e) => gestes.onEdit(e) });
  }
  if (droits.canDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: (e) => gestes.onDelete(e)
    });
  }
  return liste;
}

/**
 * La liste complète, staff et effectif compris — celle du menu du tableau.
 *
 * L'appui sur une ligne ouvre déjà le staff et l'effectif : le balayage ne le refait
 * pas. Le tableau, lui, n'a pas de ligne cliquable et doit donc tout offrir.
 */
export const gestesDEquipeAuTableau = (
  droits: DroitsSurEquipes,
  gestes: GestesDEquipe
): SwipeAction<EquipeLike>[] => [
  { id: 'effectif', label: 'Staff et effectif', icon: Users, run: (e) => gestes.onRoster(e) },
  ...gestesDEquipe(droits, gestes)
];
