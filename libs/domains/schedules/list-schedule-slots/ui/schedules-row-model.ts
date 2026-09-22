import { Edit, Eye, EyeOff, Trash2 } from '@lucide/svelte';
import type { SwipeAction, Tone } from '@nba/ui';
import { AUDIENCE_LABELS, WEEKDAY_LABELS } from '../../shared/schema';

/**
 * Le vocabulaire des créneaux.
 *
 * Trois actions étaient écrites deux fois — une fois en items de menu pour le tableau,
 * une fois en boutons pleine largeur pour la carte mobile — et les libellés de jour et
 * de groupe se relisaient dans les deux. Rien de tout cela ne se testait sans monter
 * l'écran, qui n'avait d'ailleurs aucun test.
 */

export type CreneauLike = {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string;
  audience: keyof typeof AUDIENCE_LABELS;
  label: string | null;
  active: boolean;
  indiv: boolean;
  venueId: number;
  venue: { name: string } | null;
};

/*
  `||` et non `??` : la case 0 du tableau des jours est la chaîne vide — il est indexé à
  partir de lundi — et un `??` l'aurait laissée passer. Un en-tête de section vide ne
  ressemble pas à une erreur, il ressemble à un trou.
*/
export const libelleDeJour = (weekday: number): string => WEEKDAY_LABELS[weekday] || 'Jour inconnu';

export const libelleDeGroupe = (audience: CreneauLike['audience']): string =>
  AUDIENCE_LABELS[audience] ?? audience;

/**
 * Les créneaux dans l'ordre où on les lit : par jour, puis par heure.
 *
 * Les sections d'une liste suivent l'ordre d'apparition — trier est donc la condition
 * pour que « Lundi » ne revienne pas trois fois plus bas. L'API rend les lignes dans
 * l'ordre de création, ce qui ne veut rien dire pour une semaine.
 */
export function creneauxOrdonnes<T extends CreneauLike>(creneaux: readonly T[]): T[] {
  return [...creneaux].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)
  );
}

export type LigneDeCreneau = {
  titre: string;
  sousTitre: string;
  valeur: string;
  legende: string;
  ton: Tone;
};

/**
 * Projection d'un créneau en ligne de liste.
 *
 * L'intitulé **remplace** le nom du groupe — c'est ce que le formulaire promet, et ce
 * que le site public affiche. Les accoler donnait « Poussins (U11) · Poussins (U11) »
 * dès que l'intitulé reprenait le groupe, ce qu'il fait souvent. Le groupe rejoint
 * alors le gymnase en sous-titre : il reste lisible sans occuper la ligne du titre.
 *
 * L'heure tient la droite en deux temps, le début puis la fin en légende. Le jour ne
 * descend pas dans la rangée : il coiffe sa section, et l'y répéter à chaque ligne
 * prenait la place du reste.
 *
 * Un créneau masqué s'éteint : il ne paraît pas sur le site public.
 */
export function ligneDeCreneau(slot: CreneauLike): LigneDeCreneau {
  const intitule = slot.label?.trim();
  const groupe = libelleDeGroupe(slot.audience);
  const gymnase = slot.venue?.name ?? 'Gymnase inconnu';
  return {
    titre: intitule || groupe,
    sousTitre: intitule && intitule !== groupe ? `${groupe} · ${gymnase}` : gymnase,
    valeur: slot.startTime,
    legende: `→ ${slot.endTime}`,
    ton: slot.active ? 'foreground' : 'muted'
  };
}

export type Pastille = { label: string; variant: 'secondary' | 'outline' };

/**
 * Ce qu'un créneau signale, et rien de plus.
 *
 * Paraître sur le site est le cas courant et ne s'annonce pas ; c'est l'absence qui
 * doit se voir. Les séances individuelles sont l'autre exception : elles ouvrent une
 * programmation à part, et rien d'autre ne le disait.
 */
export function signalementsDeCreneau(slot: CreneauLike): Pastille[] {
  const liste: Pastille[] = [];
  if (!slot.active) liste.push({ label: 'Masqué', variant: 'secondary' });
  if (slot.indiv) liste.push({ label: 'Indiv', variant: 'outline' });
  return liste;
}

export type GestesDeCreneau = {
  canWrite?: boolean;
  onEdit: (slot: CreneauLike) => void;
  onToggle: (slot: CreneauLike) => void;
  onDelete: (slot: CreneauLike) => void;
};

/**
 * Ce qu'on peut faire d'un créneau.
 *
 * **Masquer vient en tête** : c'est le geste courant d'une saison — une salle
 * indisponible, un groupe en pause — et il se défait du même doigt, la condition pour
 * qu'un balayage long le porte. La suppression ne porte pas de question ici : l'écran
 * en pose déjà une, et la sienne dit ce que la générique tairait — qu'il vaut mieux
 * masquer pour un retrait temporaire, l'historique étant conservé.
 */
export function gestesDeCreneau(slot: CreneauLike, gestes: GestesDeCreneau): SwipeAction<CreneauLike>[] {
  if (!gestes.canWrite) return [];
  return [
    {
      id: 'masquer',
      label: slot.active ? 'Masquer du site' : 'Réafficher',
      icon: slot.active ? EyeOff : Eye,
      tone: 'primary',
      run: (x) => gestes.onToggle(x)
    },
    { id: 'modifier', label: 'Modifier', icon: Edit, run: (x) => gestes.onEdit(x) },
    {
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: (x) => gestes.onDelete(x)
    }
  ];
}

/* ------------------------------------------------------------------ filtres */

export type VisibiliteDeCreneau = 'tous' | 'affiches' | 'masques';

export const VISIBILITES: { value: VisibiliteDeCreneau; label: string }[] = [
  { value: 'tous', label: 'Tous les créneaux' },
  { value: 'affiches', label: 'Affichés sur le site' },
  { value: 'masques', label: 'Masqués' }
];

/**
 * Réduit la liste à ce qu'on cherche.
 *
 * La visibilité mérite un filtre : affichés et masqués se mêlaient dans une seule
 * liste, et rien ne permettait de retrouver ce qu'on avait retiré du site.
 */
export function creneauxFiltres<T extends CreneauLike>(
  creneaux: readonly T[],
  { recherche = '', visibilite = 'tous' }: { recherche?: string; visibilite?: VisibiliteDeCreneau }
): T[] {
  const terme = recherche.trim().toLowerCase();
  return creneauxOrdonnes(creneaux).filter((slot) => {
    if (visibilite === 'affiches' && !slot.active) return false;
    if (visibilite === 'masques' && slot.active) return false;
    if (!terme) return true;
    return [
      libelleDeJour(slot.weekday),
      libelleDeGroupe(slot.audience),
      slot.label ?? '',
      slot.venue?.name ?? ''
    ].some((champ) => champ.toLowerCase().includes(terme));
  });
}
