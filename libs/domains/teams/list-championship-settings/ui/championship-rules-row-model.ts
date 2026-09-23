import { ExternalLink, Pencil } from '@lucide/svelte';
import type { SwipeAction } from '@nba/ui';

/**
 * Le vocabulaire des règlements de championnat.
 *
 * Une carte par championnat portait deux champs de saisie et un bouton, côte à côte :
 * à 390 px, le bouton « Enregistrer » se retrouvait collé contre un champ de deux
 * centimètres. Et la question qu'on vient poser — **lesquels manquent ?** — n'était
 * lisible qu'en parcourant les cartes une à une.
 */

export type ReglementLike = {
  championship: string;
  label: string;
  rulesUrl: string | null;
  rulesLabel: string | null;
};

/** Le règlement est-il déposé ? C'est la seule question de cet écran. */
export const reglementDepose = (r: ReglementLike): boolean => Boolean(r.rulesUrl?.trim());

/**
 * Sous le nom du championnat : ce qui a été déposé.
 *
 * Le libellé quand il y en a un, sinon le domaine du lien — « il y a bien quelque
 * chose, et voilà d'où ça vient ». L'adresse entière déborderait de la ligne.
 */
export const detailDeReglement = (r: ReglementLike): string => {
  if (!reglementDepose(r)) return 'Aucun lien déposé';
  const libelle = r.rulesLabel?.trim();
  if (libelle) return libelle;
  try {
    return new URL(r.rulesUrl as string).hostname;
  } catch {
    // Une adresse que le navigateur refuse de lire est une adresse à corriger : la
    // montrer telle quelle vaut mieux que de la taire.
    return r.rulesUrl as string;
  }
};

/**
 * La pastille, et seulement pour l'exception.
 *
 * Un championnat pourvu de son règlement est le cas courant : il ne se signale pas.
 * Le manque, lui, se voit — c'est le texte qui fait foi le soir de la rencontre.
 */
export const pastilleDeReglement = (
  r: ReglementLike
): { label: string; variant: 'warning' } | undefined =>
  reglementDepose(r) ? undefined : { label: 'Sans règlement', variant: 'warning' };

export type GestesDeReglement = {
  onEdit: (r: ReglementLike) => void;
  onOpen: (r: ReglementLike) => void;
};

/**
 * Ce qu'on peut faire d'un règlement.
 *
 * Ouvrir vient en tête, et n'apparaît que lorsqu'il y a quelque chose à ouvrir : une
 * adresse fausse ne se voit pas autrement qu'en la suivant. C'est aussi le geste
 * réversible, or la première action déclarée est celle qu'un balayage long exécute.
 */
export function gestesDeReglement(
  r: ReglementLike,
  droits: { canWrite?: boolean },
  gestes: GestesDeReglement
): SwipeAction<ReglementLike>[] {
  const liste: SwipeAction<ReglementLike>[] = [];
  if (reglementDepose(r)) {
    liste.push({
      id: 'ouvrir',
      label: 'Ouvrir le règlement',
      icon: ExternalLink,
      tone: 'primary',
      run: (x) => gestes.onOpen(x)
    });
  }
  if (droits.canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier le lien', icon: Pencil, run: (x) => gestes.onEdit(x) });
  }
  return liste;
}
