/**
 * Vocabulaire de la vue liste — ce qu'on affiche d'un objet sur un téléphone.
 *
 * La règle qui a présidé à cette forme : sur téléphone on n'affiche pas un tableau,
 * on affiche une liste. Une ligne porte l'identité à gauche, la seule valeur qui
 * compte à droite, et rien d'autre ; les autres colonnes vivent dans la fiche de
 * détail. D'où un modèle volontairement pauvre — si un écran a besoin d'y ajouter
 * un cinquième champ, c'est le signe qu'il faut une fiche, pas une colonne de plus.
 */

/**
 * Rôle sémantique d'une valeur, jamais sa couleur.
 *
 * Centralisé ici pour que les domaines cessent d'écrire des ternaires de couleur
 * dans leur markup — c'est ce qui avait fait diverger les libellés de statut entre
 * la vue tableau et la vue mobile de la liste des adhérents.
 */
export type Tone = 'muted' | 'foreground' | 'primary' | 'success' | 'warning' | 'destructive';

export const TONE_CLASS: Record<Tone, string> = {
  muted: 'text-muted-foreground',
  foreground: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

/**
 * La projection d'un objet métier en ligne de liste.
 *
 * À produire par une fonction pure `toRow(item)` vivant à côté de la table, en TS
 * et non dans le markup : c'est elle qui rend les libellés testables et empêche
 * qu'ils dérivent entre les deux rendus.
 */
export type ListRowModel = {
  /** Destination de l'appui. Sans elle, la ligne n'est pas navigable et perd son chevron. */
  href?: string;
  title: string;
  subtitle?: string;
  /** La valeur qui compte, alignée à droite : montant, statut, date. */
  value?: string;
  valueTone?: Tone;
  /** Deuxième ligne à droite, sous la valeur. */
  valueCaption?: string;
};

/**
 * Une action de ligne, déclarée une fois et servie par trois voies : le balayage
 * du doigt, le bouton escamoté au clavier, l'annonce du lecteur d'écran. C'est la
 * condition pour que le geste ne soit jamais le seul chemin.
 */
export type SwipeAction<T = unknown> = {
  id: string;
  /** Sert aussi de nom accessible : jamais une icône seule. */
  label: string;
  icon?: any;
  tone?: 'neutral' | 'primary' | 'destructive';
  /** Question posée avant exécution. De fait obligatoire sur une action destructrice. */
  confirm?: string;
  run: (item: T) => void | Promise<void>;
};
