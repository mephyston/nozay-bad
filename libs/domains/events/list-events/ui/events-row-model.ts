import { Ban, Edit, Eye, Trash2, Users } from '@lucide/svelte';
import type { SwipeAction, Tone } from '@nba/ui';
import { EVENT_CATEGORY_LABELS, EVENT_REGISTRATION_LABELS } from '../../shared/schema';

/**
 * Le vocabulaire de l'agenda.
 *
 * Cinq actions étaient écrites deux fois — en items de menu pour le tableau, en
 * boutons qui passaient à la ligne pour la carte mobile — dans un composant de 598
 * lignes qui n'avait aucun test, faute même d'un projet pour les collecter.
 */

export type EvenementLike = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venueLabel: string | null;
  category: keyof typeof EVENT_CATEGORY_LABELS;
  status: 'draft' | 'published' | 'cancelled';
  registration: 'none' | 'open' | 'closed';
  registrationCount: number;
  attendeeCount: number;
};

export const libelleDeCategorie = (c: EvenementLike['category']): string =>
  EVENT_CATEGORY_LABELS[c] ?? c;

export const libelleDInscription = (r: EvenementLike['registration']): string =>
  EVENT_REGISTRATION_LABELS[r] ?? r;

const horodatage = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Les dates de l'agenda sont stockées en heure locale sans fuseau : les relire telles
 * quelles évite le décalage qu'introduirait un passage par UTC.
 */
export function quand(v: string): string {
  /*
    La forme est vérifiée avant de construire la date : `new Date('pas une date:00')`
    ne lève pas et ne rend pas `Invalid Date` — il rend le 1er janvier 2000. Une valeur
    abîmée se serait donc affichée comme une date plausible, ce qui est pire que rien.
  */
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v ?? '')) return '—';
  const d = new Date(`${v}:00`);
  return isNaN(d.getTime()) ? '—' : horodatage.format(d);
}

/* ------------------------------------------------------------------ sections */

const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** La clé de regroupement : « 2026-05 », triable comme du texte. */
export const moisDe = (e: Pick<EvenementLike, 'startsAt'>): string => e.startsAt.slice(0, 7);

/** « mai 2026 », en minuscules comme le français l'écrit. */
export function libelleDeMois(cle: string): string {
  const d = new Date(`${cle}-01T12:00:00`);
  return isNaN(d.getTime()) ? cle : mois.format(d);
}

/**
 * L'agenda, du plus proche au plus lointain.
 *
 * Les sections d'une liste suivent l'ordre d'apparition : trier est la condition pour
 * qu'un mois ne revienne pas plus bas. L'API rend `past=1`, donc le passé et l'avenir
 * se mêlent — on les lit dans l'ordre du calendrier, le plus récent d'abord, comme on
 * lit un agenda qu'on remonte.
 */
export function evenementsOrdonnes<T extends EvenementLike>(evenements: readonly T[]): T[] {
  return [...evenements].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

/* ------------------------------------------------------------------ projection */

const STATUTS: Record<EvenementLike['status'], { label: string; ton: Tone }> = {
  published: { label: 'En ligne', ton: 'foreground' },
  draft: { label: 'Brouillon', ton: 'muted' },
  cancelled: { label: 'Annulé', ton: 'destructive' }
};

export const statutDEvenement = (e: Pick<EvenementLike, 'status'>) => STATUTS[e.status] ?? STATUTS.draft;

export type LigneDEvenement = {
  titre: string;
  sousTitre: string;
  valeur?: string;
  legende?: string;
  ton: Tone;
};

/**
 * Projection d'un événement en ligne de liste.
 *
 * Le titre identifie, la date et le lieu situent. La valeur est le nombre d'inscrits —
 * c'est ce qu'on vient vérifier d'un événement à venir, et le tableau lui consacrait
 * deux colonnes pour le dire. Un événement sans inscription n'en porte aucune : la
 * colonne restait vide sur la moitié des lignes.
 *
 * Le mois ne descend pas dans la rangée : il coiffe sa section.
 */
export function ligneDEvenement(e: EvenementLike): LigneDEvenement {
  const lieu = e.venueLabel?.trim();
  const avecInscriptions = e.registration !== 'none';
  return {
    titre: e.title,
    sousTitre: lieu ? `${quand(e.startsAt)} · ${lieu}` : quand(e.startsAt),
    valeur: avecInscriptions ? String(e.registrationCount) : undefined,
    /* Les accompagnants comptent pour le traiteur et pour les tables : « 12 inscrits,
       18 personnes » n'est pas la même soirée. */
    legende: avecInscriptions
      ? e.attendeeCount > e.registrationCount
        ? `${e.attendeeCount} personnes`
        : 'inscrit(s)'
      : undefined,
    ton: statutDEvenement(e).ton
  };
}

export type Pastille = { label: string; variant: 'secondary' | 'destructive' | 'outline' };

/**
 * Ce qu'un événement signale, et rien de plus.
 *
 * Paraître sur le site est le cas courant et ne s'annonce pas. Restent le brouillon,
 * qui attend une décision, et l'annulation, qui en est une. « Inscriptions closes »
 * s'y ajoute : l'événement paraît encore, mais plus personne ne peut s'y inscrire, et
 * rien d'autre ne le disait.
 */
export function signalementsDEvenement(e: EvenementLike): Pastille[] {
  const liste: Pastille[] = [];
  if (e.status === 'cancelled') liste.push({ label: 'Annulé', variant: 'destructive' });
  else if (e.status === 'draft') liste.push({ label: 'Brouillon', variant: 'secondary' });
  if (e.registration === 'closed') liste.push({ label: 'Inscriptions closes', variant: 'outline' });
  return liste;
}

/* ------------------------------------------------------------------ gestes */

export type DroitsSurEvenements = {
  canWrite?: boolean;
  canDelete?: boolean;
  canReadRegistrations?: boolean;
};

export type GestesDEvenement = {
  onEdit: (e: EvenementLike) => void;
  onSetStatus: (e: EvenementLike, statut: EvenementLike['status']) => void;
  onRegistrations: (e: EvenementLike) => void;
  onDelete: (e: EvenementLike) => void;
};

/**
 * Ce qu'on peut faire d'un événement.
 *
 * **Publier vient en tête** : c'est l'étape du parcours, et elle se défait — la
 * condition pour qu'un balayage long la porte.
 *
 * L'annulation, elle, porte sa question. L'écran n'en posait aucune : un doigt sur un
 * bouton voisin retirait la fiche de l'agenda du site, et les inscrits la voyaient
 * disparaître. Elle n'est pas destructrice au sens de la base — l'événement reste
 * ici — mais elle est publique et immédiate, ce que la question doit dire.
 *
 * La suppression, à l'inverse, ne porte rien ici : l'écran l'interroge déjà, et sa
 * question conseille l'annulation plutôt, ce qu'une formule générique tairait.
 */
export function gestesDEvenement(
  e: EvenementLike,
  droits: DroitsSurEvenements,
  gestes: GestesDEvenement
): SwipeAction<EvenementLike>[] {
  const liste: SwipeAction<EvenementLike>[] = [];

  if (droits.canWrite && e.status !== 'published') {
    liste.push({
      id: 'publier',
      label: 'Publier',
      icon: Eye,
      tone: 'primary',
      run: (x) => gestes.onSetStatus(x, 'published')
    });
  }
  if (droits.canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Edit, run: (x) => gestes.onEdit(x) });
  }
  if (droits.canReadRegistrations && e.registration !== 'none') {
    liste.push({
      id: 'inscrits',
      label: 'Voir les inscrits',
      icon: Users,
      run: (x) => gestes.onRegistrations(x)
    });
  }
  if (droits.canWrite && e.status === 'published') {
    liste.push({
      id: 'annuler',
      label: "Annuler l'événement",
      icon: Ban,
      confirm: `Annuler « ${e.title} » ? La fiche quitte l'agenda du site : les adhérents inscrits la verront disparaître. Elle reste ici, et peut être republiée.`,
      run: (x) => gestes.onSetStatus(x, 'cancelled')
    });
  }
  if (droits.canDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: (x) => gestes.onDelete(x)
    });
  }

  return liste;
}

/* ------------------------------------------------------------------ filtres */

export type StatutFiltre = 'tous' | 'draft' | 'published' | 'cancelled';
export type PeriodeFiltre = 'tous' | 'avenir' | 'passes';

export const STATUTS_FILTRE: { value: StatutFiltre; label: string }[] = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'published', label: 'En ligne' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'cancelled', label: 'Annulés' }
];

export const PERIODES_FILTRE: { value: PeriodeFiltre; label: string }[] = [
  { value: 'tous', label: 'Toutes les dates' },
  { value: 'avenir', label: 'À venir' },
  { value: 'passes', label: 'Passés' }
];

/**
 * Réduit l'agenda à ce qu'on cherche.
 *
 * La période mérite un filtre à elle seule : l'écran charge le passé avec l'avenir, et
 * un club de dix ans de tournois n'a aucun moyen d'atteindre la semaine prochaine.
 */
export function evenementsFiltres<T extends EvenementLike>(
  evenements: readonly T[],
  {
    recherche = '',
    statut = 'tous',
    periode = 'tous',
    maintenant = () => new Date()
  }: {
    recherche?: string;
    statut?: StatutFiltre;
    periode?: PeriodeFiltre;
    /** Injectable pour les tests : l'horloge de la suite est figée. */
    maintenant?: () => Date;
  }
): T[] {
  const terme = recherche.trim().toLowerCase();
  const repere = maintenant().toISOString().slice(0, 16);

  return evenementsOrdonnes(evenements).filter((e) => {
    if (statut !== 'tous' && e.status !== statut) return false;
    if (periode === 'avenir' && e.startsAt < repere) return false;
    if (periode === 'passes' && e.startsAt >= repere) return false;
    if (!terme) return true;
    return [e.title, libelleDeCategorie(e.category), e.venueLabel ?? ''].some((champ) =>
      champ.toLowerCase().includes(terme)
    );
  });
}
