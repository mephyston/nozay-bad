import { Edit, ExternalLink, Trash2 } from '@lucide/svelte';
import type { SwipeAction, Tone } from '@nba/ui';

/**
 * Le vocabulaire des pages du site.
 *
 * Trois actions étaient écrites deux fois — en items de menu pour le tableau, en deux
 * boutons pleine largeur pour la carte mobile, où « Voir sur le site » manquait
 * d'ailleurs. Les libellés de statut se relisaient dans les deux.
 */

export type PageLike = {
  id: number;
  title: string;
  path: string;
  status: 'draft' | 'published';
  updatedAt: number | string;
};

export const estEnLigne = (page: PageLike): boolean => page.status === 'published';

const formateur = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

/** Les dates du CMS arrivent en secondes depuis l'API, en chaîne depuis un formulaire. */
export function dateFr(v: number | string | null): string {
  if (!v) return '—';
  const d = new Date(typeof v === 'number' ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? '—' : formateur.format(d);
}

export type LigneDePage = {
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'une page en ligne de liste.
 *
 * Le titre identifie, l'adresse situe — c'est elle qu'on donne quand on partage, et la
 * seule chose qui distingue deux pages au titre voisin. La date de dernière
 * modification est la valeur : c'est ce qu'on vient vérifier d'un site qu'on entretient.
 *
 * Un brouillon s'éteint : il ne paraît pas sur le site public.
 */
export function ligneDePage(page: PageLike): LigneDePage {
  return {
    titre: page.title,
    sousTitre: page.path,
    valeur: dateFr(page.updatedAt),
    ton: estEnLigne(page) ? 'foreground' : 'muted'
  };
}

export type Pastille = { label: string; variant: 'secondary' };

/**
 * Ce qu'une page signale, et rien de plus.
 *
 * Paraître sur le site est le cas courant et ne s'annonce pas ; c'est le brouillon qui
 * attend une décision, et qui doit se voir.
 */
export const signalementsDePage = (page: PageLike): Pastille[] =>
  estEnLigne(page) ? [] : [{ label: 'Brouillon', variant: 'secondary' }];

export type DroitsSurPages = { canWrite?: boolean; canDelete?: boolean };

export type GestesDePage = {
  onEdit: (page: PageLike) => void;
  onOpenSite: (page: PageLike) => void;
  onDelete: (page: PageLike) => void;
};

/**
 * Ce qu'on peut faire d'une page.
 *
 * Modifier vient en tête : une page se travaille dans son éditeur, et c'est le geste
 * de loin le plus fréquent. « Voir sur le site » n'apparaît qu'une fois la page en
 * ligne — l'adresse ne répond pas avant — et il manquait entièrement au téléphone.
 *
 * La suppression ne porte pas de question ici : l'écran en pose déjà une, et la sienne
 * rappelle de créer une redirection, ce qu'une formule générique tairait.
 */
export function gestesDePage(
  page: PageLike,
  droits: DroitsSurPages,
  gestes: GestesDePage
): SwipeAction<PageLike>[] {
  const liste: SwipeAction<PageLike>[] = [];

  if (droits.canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Edit, tone: 'primary', run: (p) => gestes.onEdit(p) });
  }
  if (estEnLigne(page)) {
    liste.push({
      id: 'site',
      label: 'Voir sur le site',
      icon: ExternalLink,
      run: (p) => gestes.onOpenSite(p)
    });
  }
  if (droits.canDelete) {
    liste.push({
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      run: (p) => gestes.onDelete(p)
    });
  }

  return liste;
}

/* ------------------------------------------------------------------ filtres */

export type StatutDePage = 'tous' | 'published' | 'draft';

export const STATUTS_DE_PAGE: { value: StatutDePage; label: string }[] = [
  { value: 'tous', label: 'Toutes les pages' },
  { value: 'published', label: 'En ligne' },
  { value: 'draft', label: 'Brouillons' }
];

/** Réduit la liste à ce qu'on cherche. Les brouillons se mêlaient aux pages publiées. */
export function pagesFiltrees<T extends PageLike>(
  pages: readonly T[],
  { recherche = '', statut = 'tous' }: { recherche?: string; statut?: StatutDePage }
): T[] {
  const terme = recherche.trim().toLowerCase();
  return pages.filter((page) => {
    if (statut !== 'tous' && page.status !== statut) return false;
    if (!terme) return true;
    return page.title.toLowerCase().includes(terme) || page.path.toLowerCase().includes(terme);
  });
}
