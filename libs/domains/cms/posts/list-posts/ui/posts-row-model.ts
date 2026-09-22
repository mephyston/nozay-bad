import { Edit, ExternalLink, Eye, EyeOff, Send, Trash2 } from '@lucide/svelte';
import type { SwipeAction, Tone } from '@nba/ui';

/**
 * Le vocabulaire des actualités.
 *
 * Les gestes vivaient dans un snippet de menu, partagé par la carte mobile et la ligne
 * du tableau — un progrès sur les autres écrans, mais en markup : le balayage ne pouvait
 * pas s'en servir, et rien ne se testait sans monter le composant.
 */

/** Ce que le modèle a besoin de savoir d'une actualité, et rien de plus. */
export type ActualiteLike = {
  id: number;
  title: string;
  path: string;
  status: 'draft' | 'published';
  visibility: 'public' | 'private';
  notifiedAt: number | string | null;
  publishedAt: number | string | null;
};

export const estEnLigne = (row: ActualiteLike): boolean => row.status === 'published';

const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

/** Les dates du CMS arrivent en secondes depuis l'API, en chaîne depuis un formulaire. */
export function dateFr(v: number | string | null): string {
  if (!v) return '—';
  const d = new Date(typeof v === 'number' ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? '—' : formatter.format(d);
}

export type LigneDActualite = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'une actualité en ligne de liste.
 *
 * Le titre identifie, l'adresse situe — c'est elle qu'on donne quand on partage, et la
 * seule chose qui distingue deux articles au titre voisin. La date de publication est la
 * valeur : elle dit si l'article est passé, et elle s'éteint sur un brouillon, qui n'en a
 * pas encore. Le chapô ne descend pas ici : quatre-vingt-dix caractères sous chaque titre
 * noyaient la liste, et il se lit dans le formulaire, qui est fait pour ça.
 */
export function ligneDActualite(row: ActualiteLike): LigneDActualite {
  return {
    titre: row.title,
    sousTitre: row.path,
    valeur: dateFr(row.publishedAt),
    ton: estEnLigne(row) ? 'foreground' : 'muted'
  };
}

/** Diffusable : réservée, en ligne, jamais encore envoyée, et le droit d'envoyer. */
export const estDiffusable = (row: ActualiteLike, canNotify: boolean): boolean =>
  canNotify && row.visibility === 'private' && estEnLigne(row) && !row.notifiedAt;

export type Pastille = { label: string; variant: 'outline' | 'warning' | 'primary-soft' };

/**
 * Ce qui, dans une actualité, sort de l'ordinaire.
 *
 * Trois pastilles tenaient sur la ligne du titre, et sur un téléphone c'est le titre
 * qui cédait : « Retour sur l'AG 2025-2026 » s'affichait « Retou… » derrière
 * « Adhérents · À diffuser · En ligne ». Or une actualité publique et publiée est le
 * cas courant, et le cas courant ne s'annonce pas. Ne restent que les écarts :
 * réservée aux adhérents, en attente de diffusion, pas encore publiée.
 *
 * « À diffuser » remplace « Adhérents » plutôt que de s'y ajouter : elle ne peut
 * concerner qu'une actualité réservée, et elle en dit davantage.
 */
export function signalementsDActualite(row: ActualiteLike, canNotify = false): Pastille[] {
  const liste: Pastille[] = [];
  if (estDiffusable(row, canNotify)) liste.push({ label: 'À diffuser', variant: 'warning' });
  else if (row.visibility === 'private') liste.push({ label: 'Adhérents', variant: 'outline' });
  if (!estEnLigne(row)) liste.push({ label: 'Brouillon', variant: 'outline' });
  return liste;
}

/**
 * Les mêmes, plus le cas courant.
 *
 * Le tableau a une colonne « Statut » : la laisser vide sur une actualité ordinaire
 * ressemblerait à une donnée manquante. Elle dit donc aussi « En ligne », que la liste
 * au doigt tait faute de place.
 */
export function pastillesDeTableau(row: ActualiteLike, canNotify = false): Pastille[] {
  const liste = signalementsDActualite(row, canNotify);
  return estEnLigne(row) ? [...liste, { label: 'En ligne', variant: 'primary-soft' }] : liste;
}

export type DroitsSurActualites = {
  canWrite?: boolean;
  canDelete?: boolean;
  canNotify?: boolean;
};

export type GestesDActualite = {
  onEdit: (row: ActualiteLike) => void;
  onTogglePublish: (row: ActualiteLike) => void;
  onNotify: (row: ActualiteLike) => void;
  onOpenSite: (row: ActualiteLike) => void;
  onDelete: (row: ActualiteLike) => void;
};

/**
 * Ce qu'on peut faire d'une actualité.
 *
 * **Publier vient en tête** : c'est l'étape du parcours, et elle se défait d'un second
 * geste — la condition pour qu'un balayage long la porte. Diffuser et supprimer ne
 * portent pas de question ici : l'écran en pose déjà une, et la sienne dit ce que la
 * générique ne dirait pas — qu'un envoi atteint tout le club et ne se rattrape pas,
 * qu'une adresse supprimée cesse de répondre. La doubler ferait répondre deux fois, et
 * la seconde serait la moins précise.
 */
export function gestesDActualite(
  row: ActualiteLike,
  droits: DroitsSurActualites,
  gestes: GestesDActualite
): SwipeAction<ActualiteLike>[] {
  const liste: SwipeAction<ActualiteLike>[] = [];

  if (droits.canWrite) {
    liste.push({
      id: 'publier',
      label: estEnLigne(row) ? 'Repasser en brouillon' : 'Publier',
      icon: estEnLigne(row) ? EyeOff : Eye,
      tone: 'primary',
      run: gestes.onTogglePublish
    });
    liste.push({ id: 'modifier', label: 'Modifier', icon: Edit, run: gestes.onEdit });
  }

  if (estDiffusable(row, !!droits.canNotify)) {
    liste.push({ id: 'diffuser', label: 'Prévenir les adhérents', icon: Send, run: gestes.onNotify });
  }

  if (estEnLigne(row) && row.visibility === 'public') {
    liste.push({ id: 'site', label: 'Voir sur le site', icon: ExternalLink, run: gestes.onOpenSite });
  }

  if (droits.canDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: gestes.onDelete
    });
  }

  return liste;
}
