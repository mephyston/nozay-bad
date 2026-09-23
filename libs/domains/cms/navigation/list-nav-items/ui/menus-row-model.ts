import { ChevronDown, ChevronUp, CornerDownRight, Edit, Trash2 } from '@lucide/svelte';
import type { SwipeAction, Tone } from '@nba/ui';
import type { NavLocation } from '../../../shared/nav';

/**
 * Le vocabulaire des menus du site.
 *
 * Chaque rangée portait trois affordances visibles — deux flèches de 32 px et un menu
 * « … » — là où la règle en veut une seule, et les cinq gestes étaient écrits deux
 * fois, une fois pour le premier niveau et une fois pour les sous-entrées.
 */

export type EntreeLike = {
  id: number;
  location: NavLocation;
  parentId: number | null;
  label: string;
  pageId: number | null;
  externalUrl: string | null;
  position: number;
  /** Nul pour un conteneur : une entrée qui ne fait que regrouper. */
  href: string | null;
  children: EntreeLike[];
};

/** Une entrée sans cible ne fait que coiffer ses sous-entrées. */
export const estConteneur = (e: EntreeLike): boolean => e.href === null;

export type LigneDEntree = {
  titre: string;
  sousTitre: string;
  ton: Tone;
};

/**
 * Projection d'une entrée de menu en ligne de liste.
 *
 * L'intitulé identifie — c'est le mot que le visiteur lit dans la barre du site — et
 * la cible situe : une adresse interne, une adresse extérieure, ou rien du tout quand
 * l'entrée ne fait que regrouper. Un conteneur s'éteint : il ne mène nulle part.
 */
export function ligneDEntree(e: EntreeLike): LigneDEntree {
  return {
    titre: e.label,
    sousTitre: estConteneur(e)
      ? 'Regroupe seulement ses sous-entrées'
      : (e.externalUrl ?? e.href ?? ''),
    ton: estConteneur(e) ? 'muted' : 'foreground'
  };
}

/** Une liste plate, où chaque entrée sait si elle est une sous-entrée. */
export type RangeeDeMenu = { entree: EntreeLike; fratrie: EntreeLike[]; rang: number; enfant: boolean };

/**
 * Aplatit l'arbre à deux niveaux dans l'ordre où on le lit.
 *
 * Une liste ne connaît que des rangées : c'est à l'écran de dire lesquelles sont des
 * sous-entrées. La fratrie voyage avec chaque rangée parce que déplacer une entrée
 * renvoie **l'ordre complet de sa fratrie**, et non un échange deux à deux — le
 * serveur renumérote de 0 à n, ce qui répare au passage les trous d'une suppression.
 */
export function rangeesDeMenu(arbre: readonly EntreeLike[]): RangeeDeMenu[] {
  const rangees: RangeeDeMenu[] = [];
  const parents = [...arbre];
  parents.forEach((entree, rang) => {
    rangees.push({ entree, fratrie: parents, rang, enfant: false });
    const enfants = entree.children ?? [];
    enfants.forEach((fils, rangFils) => {
      rangees.push({ entree: fils, fratrie: enfants, rang: rangFils, enfant: true });
    });
  });
  return rangees;
}

export type GestesDeMenu = {
  canWrite?: boolean;
  onEdit: (e: EntreeLike) => void;
  onAddChild: (e: EntreeLike) => void;
  onMove: (fratrie: EntreeLike[], rang: number, delta: number) => void;
  onRemove: (e: EntreeLike) => void;
};

/**
 * Ce qu'on peut faire d'une entrée de menu.
 *
 * **Monter vient en tête** : ranger le menu est le geste courant de cet écran, et il
 * se défait du même doigt. Les deux déplacements disparaissent aux extrémités plutôt
 * que de s'y désactiver : un bouton grisé occupe la place sans rien offrir, et au
 * balayage il n'y a pas de place à occuper.
 *
 * « Ajouter une sous-entrée » n'est offert qu'au premier niveau : le menu du site ne
 * descend pas plus bas.
 *
 * Le retrait ne porte pas de question ici : l'écran en pose déjà une, et la sienne
 * **compte les sous-entrées emportées** — ce qu'une formule générique tairait.
 */
export function gestesDEntree(
  rangee: RangeeDeMenu,
  gestes: GestesDeMenu
): SwipeAction<EntreeLike>[] {
  if (!gestes.canWrite) return [];
  const { entree, fratrie, rang, enfant } = rangee;
  const liste: SwipeAction<EntreeLike>[] = [];

  if (rang > 0) {
    liste.push({
      id: 'monter',
      label: 'Monter',
      icon: ChevronUp,
      tone: 'primary',
      run: () => gestes.onMove(fratrie, rang, -1)
    });
  }
  if (rang < fratrie.length - 1) {
    liste.push({
      id: 'descendre',
      label: 'Descendre',
      icon: ChevronDown,
      run: () => gestes.onMove(fratrie, rang, 1)
    });
  }

  liste.push({ id: 'modifier', label: 'Modifier', icon: Edit, run: (e) => gestes.onEdit(e) });

  if (!enfant) {
    liste.push({
      id: 'sous-entree',
      label: 'Ajouter une sous-entrée',
      icon: CornerDownRight,
      run: (e) => gestes.onAddChild(e)
    });
  }

  liste.push({
    id: 'retirer',
    label: 'Retirer du menu',
    icon: Trash2,
    tone: 'destructive',
    run: (e) => gestes.onRemove(e)
  });

  return liste;
}
