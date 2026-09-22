import { Edit, Trash2 } from '@lucide/svelte';
import { accorder, type SwipeAction, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des redirections.
 *
 * Les deux actions étaient écrites deux fois — en items de menu pour le tableau, en
 * boutons pleine largeur pour la carte mobile — et le comptage des visites se relisait
 * dans les deux, avec son pluriel recopié à la main.
 */

export type RedirectionLike = {
  id: number;
  fromPath: string;
  toPath: string | null;
  statusCode: number;
  hitCount: number;
  note: string | null;
  createdAt: number | string;
};

/**
 * Une redirection sans cible est un « 410 Gone » : l'adresse est déclarée supprimée
 * pour de bon, et non déplacée. C'est ce que dit l'absence de `toPath`.
 */
export const estDefinitive = (r: RedirectionLike): boolean => r.toPath === null;

const formateur = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

export function dateFr(v: number | string | null): string {
  if (!v) return '—';
  const d = new Date(typeof v === 'number' ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? '—' : formateur.format(d);
}

export const visites = (n: number): string =>
  n === 0 ? 'jamais empruntée' : `${n} ${accorder(n, 'visite')}`;

export type LigneDeRedirection = {
  titre: string;
  sousTitre: string;
  valeur: string;
  legende: string;
  ton: Tone;
};

/**
 * Projection d'une redirection en ligne de liste.
 *
 * L'ancienne adresse identifie : c'est elle qu'on cherche, parce que c'est elle qui
 * circule encore dans un vieux lien. La cible situe — ou son absence, pour une adresse
 * déclarée supprimée. Le nombre de visites est la valeur : il dit si la redirection
 * sert encore, donc s'il faut la garder.
 *
 * Une redirection jamais empruntée s'éteint : rien ne la réclame.
 */
export function ligneDeRedirection(r: RedirectionLike): LigneDeRedirection {
  return {
    titre: r.fromPath,
    sousTitre: estDefinitive(r) ? 'Ne répond plus' : `→ ${r.toPath}`,
    valeur: String(r.hitCount),
    legende: r.hitCount === 0 ? 'jamais' : accorder(r.hitCount, 'visite'),
    ton: r.hitCount > 0 ? 'foreground' : 'muted'
  };
}

export type Pastille = { label: string; variant: 'secondary' };

/**
 * Ce qu'une redirection signale, et rien de plus.
 *
 * Rediriger est le cas courant et ne s'annonce pas. Déclarer une adresse supprimée
 * pour de bon est l'exception, et elle change ce que le site répond.
 */
export const signalementsDeRedirection = (r: RedirectionLike): Pastille[] =>
  estDefinitive(r) ? [{ label: 'Supprimée', variant: 'secondary' }] : [];

export type GestesDeRedirection = {
  canWrite?: boolean;
  onEdit: (r: RedirectionLike) => void;
  onDelete: (r: RedirectionLike) => void;
};

/**
 * Ce qu'on peut faire d'une redirection.
 *
 * La suppression ne porte pas de question ici : l'écran en pose déjà une, et la sienne
 * **change selon le nombre de visites** — « cette adresse a encore été empruntée » ne
 * se dit pas d'une redirection que personne n'emprunte. Une formule générique perdrait
 * précisément ce qui aide à décider.
 */
export function gestesDeRedirection(
  r: RedirectionLike,
  gestes: GestesDeRedirection
): SwipeAction<RedirectionLike>[] {
  if (!gestes.canWrite) return [];
  return [
    { id: 'modifier', label: 'Modifier', icon: Edit, tone: 'primary', run: (x) => gestes.onEdit(x) },
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

export type NatureDeRedirection = 'toutes' | 'redirect' | 'gone' | 'inutilisees';

export const NATURES: { value: NatureDeRedirection; label: string; hint?: string }[] = [
  { value: 'toutes', label: 'Toutes les redirections' },
  { value: 'redirect', label: 'Vers une autre adresse' },
  { value: 'gone', label: 'Déclarées supprimées' },
  { value: 'inutilisees', label: 'Jamais empruntées', hint: 'Candidates au ménage' }
];

/**
 * Réduit la liste à ce qu'on cherche.
 *
 * « Jamais empruntées » est le filtre utile : après une migration, on accumule des
 * redirections dont on ne sait plus si elles servent. Le compteur de visites le dit,
 * mais il fallait lire la table entière pour les trouver.
 */
export function redirectionsFiltrees<T extends RedirectionLike>(
  redirections: readonly T[],
  { recherche = '', nature = 'toutes' }: { recherche?: string; nature?: NatureDeRedirection }
): T[] {
  const terme = recherche.trim().toLowerCase();
  return redirections.filter((r) => {
    if (nature === 'redirect' && estDefinitive(r)) return false;
    if (nature === 'gone' && !estDefinitive(r)) return false;
    if (nature === 'inutilisees' && r.hitCount > 0) return false;
    if (!terme) return true;
    return [r.fromPath, r.toPath ?? '', r.note ?? ''].some((champ) =>
      champ.toLowerCase().includes(terme)
    );
  });
}
