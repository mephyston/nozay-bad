import { ExternalLink, Pencil, Trash2 } from '@lucide/svelte';
import type { SwipeAction } from '@nba/ui';
import { humanSize } from './media-upload';

/**
 * Le vocabulaire de la médiathèque.
 *
 * Les trois actions vivaient en markup dans un menu posé sur **chaque vignette** : au
 * doigt, une grille à deux colonnes portait donc autant de boutons « … » que d'images,
 * là où la règle veut une seule affordance — et sur une grille, cette affordance est
 * la vignette elle-même.
 */

export type MediaLike = {
  id: number;
  key: string;
  alt: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export const estImage = (m: Pick<MediaLike, 'mimeType'>): boolean => m.mimeType.startsWith('image/');

/** Le nom qu'on lit sous une vignette ; le fichier à défaut de description. */
export const nomDeMedia = (m: MediaLike): string =>
  m.alt?.trim() || m.key.split('/').pop() || 'Sans description';

/** Ce qu'on dit d'un média sous son nom : son poids, et ses dimensions s'il en a. */
export const detailDeMedia = (m: MediaLike): string =>
  m.width && m.height
    ? `${humanSize(m.sizeBytes)} · ${m.width}×${m.height}`
    : humanSize(m.sizeBytes);

export type DroitsSurMedias = { canWrite?: boolean; canDelete?: boolean };

export type GestesDeMedia = {
  onOpen: (m: MediaLike) => void;
  onEdit: (m: MediaLike) => void;
  onDelete: (m: MediaLike) => void;
};

/**
 * Ce qu'on peut faire d'un média.
 *
 * Ouvrir vient en tête : c'est le geste de loin le plus fréquent — on vérifie une
 * image avant de s'en servir. La suppression ne porte pas de question ici : l'écran en
 * pose déjà une, et la sienne prévient que les pages qui affichent ce média doivent
 * être corrigées d'abord, ce qu'une formule générique tairait.
 */
export function gestesDeMedia(
  m: MediaLike,
  droits: DroitsSurMedias,
  gestes: GestesDeMedia
): SwipeAction<MediaLike>[] {
  const liste: SwipeAction<MediaLike>[] = [
    { id: 'ouvrir', label: 'Ouvrir', icon: ExternalLink, tone: 'primary', run: (x) => gestes.onOpen(x) }
  ];

  if (droits.canWrite) {
    liste.push({
      id: 'decrire',
      label: 'Modifier la description',
      icon: Pencil,
      run: (x) => gestes.onEdit(x)
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

export type NatureDeMedia = 'tous' | 'images' | 'documents';

export const NATURES_DE_MEDIA: { value: NatureDeMedia; label: string }[] = [
  { value: 'tous', label: 'Tous les médias' },
  { value: 'images', label: 'Images' },
  { value: 'documents', label: 'Documents' }
];

/**
 * Réduit la médiathèque à ce qu'on cherche.
 *
 * La nature mérite un filtre : les documents n'ont pas de vignette — ils s'affichent
 * tous sous la même icône — et se retrouvaient noyés entre deux photos.
 */
export function mediasFiltres<T extends MediaLike>(
  medias: readonly T[],
  { recherche = '', nature = 'tous' }: { recherche?: string; nature?: NatureDeMedia }
): T[] {
  const terme = recherche.trim().toLowerCase();
  return medias.filter((m) => {
    if (nature === 'images' && !estImage(m)) return false;
    if (nature === 'documents' && estImage(m)) return false;
    if (!terme) return true;
    return m.alt.toLowerCase().includes(terme) || m.key.toLowerCase().includes(terme);
  });
}
