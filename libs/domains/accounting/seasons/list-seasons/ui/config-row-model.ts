import type { Tone } from '@nba/ui';
import type { AccountClass, Category } from './settings-types';

/**
 * Le vocabulaire des écrans de configuration comptable.
 *
 * Trois tableaux y vivaient — catégories, classes de comptes, catégories de produits —,
 * chacun doublé d'une grille de cartes faite main : six à huit champs empilés, des
 * intitulés en capitales de dix pixels, et un bouton « Modifier » pleine largeur. On y
 * lisait tout sauf ce qu'on venait vérifier : à quelle classe comptable une catégorie
 * renvoie.
 */

/**
 * La classe comptable désignée par un code.
 *
 * Par le code, et rien d'autre. Le tableau cherchait d'abord par identifiant —
 * `ac.id === cat.receiptAccountClassId` — mais ni `AccountClass` ni `Category` ne
 * portent ces champs : la comparaison valait `undefined === undefined` et le hasard
 * décidait. Personne ne l'avait vu parce que **les `.svelte` des domaines ne sont pas
 * typés** ; sorti dans un module TypeScript, le compilateur l'a signalé aussitôt.
 */
export function classeDe(
  classes: readonly AccountClass[] | undefined,
  code: string | null | undefined
): AccountClass | undefined {
  if (!classes || code == null) return undefined;
  return classes.find((c) => c.code === code);
}

/**
 * Le couple recette / dépense d'une catégorie, en codes.
 *
 * Les codes seuls : ce sont eux qu'on rapproche d'un plan comptable, et les libellés
 * complets — « 70 - Ventes de produits et prestations » — ne tiennent pas sur une ligne
 * de téléphone. Le libellé se lit dans le tiroir d'édition.
 */
export function codesDeCategorie(
  cat: Pick<Category, 'receiptCode' | 'expenseCode'>,
  classes?: readonly AccountClass[]
): string {
  const recette = classeDe(classes, cat.receiptCode)?.code ?? cat.receiptCode;
  const depense = classeDe(classes, cat.expenseCode)?.code ?? cat.expenseCode;
  return `${recette || '—'} / ${depense || '—'}`;
}

/** Une catégorie sans aucune correspondance comptable ne se rapproche de rien. */
export function tonDeCodes(cat: Pick<Category, 'receiptCode' | 'expenseCode'>): Tone {
  return cat.receiptCode || cat.expenseCode ? 'foreground' : 'muted';
}

/**
 * Le libellé adhérent, sous celui de l'administration — **et seulement s'il diffère**.
 *
 * Les deux sont identiques sur la plupart des catégories : les répéter ferait une
 * seconde ligne qui n'apprend rien, sur chacune.
 */
export const libelleAdherent = (cat: Pick<Category, 'adminLabel' | 'adherentLabel'>): string | undefined => {
  const adherent = cat.adherentLabel?.trim();
  if (!adherent || adherent === cat.adminLabel?.trim()) return undefined;
  return `Adhérents : ${adherent}`;
};

/**
 * Les signalements d'une catégorie, et seulement les exceptions.
 *
 * Une catégorie active et visible aux notes de frais est le cas courant : le tableau la
 * badgeait « Actif » sur chaque ligne, ce qui ne distinguait plus rien.
 */
export const signalementsDeCategorie = (
  cat: Pick<Category, 'active' | 'hideInExpenses'>
): { label: string; variant: 'destructive' | 'warning' }[] => {
  const liste: { label: string; variant: 'destructive' | 'warning' }[] = [];
  if (cat.active === false) liste.push({ label: 'Inactive', variant: 'destructive' });
  if (cat.hideInExpenses) liste.push({ label: 'Hors notes de frais', variant: 'warning' });
  return liste;
};

/** L'ordre de lecture d'une liste de catégories : alphabétique, insensible aux accents. */
export const parLibelle = <T extends { adminLabel?: string | null }>(liste: readonly T[]): T[] =>
  [...liste].sort((a, b) =>
    (a.adminLabel || '').localeCompare(b.adminLabel || '', 'fr', { sensitivity: 'base' })
  );
