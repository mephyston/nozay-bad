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

/* ---------------------------------------------------------------------------
   Classes de comptes — le plan comptable associatif.
   --------------------------------------------------------------------------- */

export type TypeDeClasse = 'recette' | 'depense' | 'tresorerie';

/**
 * Le type d'une classe, en toutes lettres.
 *
 * Les tableaux écrivaient la valeur brute — « depense », sans accent, telle qu'elle
 * voyage dans l'API. Ce n'est pas du français, et c'est le seul endroit où le bureau
 * lit cette classification.
 */
export const libelleDeType = (type: TypeDeClasse | string): string =>
  ({ recette: 'Recette', depense: 'Dépense', tresorerie: 'Trésorerie' })[type] ?? type;

/* ---------------------------------------------------------------------------
   Comptes de trésorerie.
   --------------------------------------------------------------------------- */

/** Sous le nom d'un compte : la classe comptable qui le porte, code et nature. */
export const detailDeCompte = (compte: {
  classCode: string;
  classType: TypeDeClasse | string;
}): string => `${compte.classCode} · ${libelleDeType(compte.classType)}`;

/* ---------------------------------------------------------------------------
   Exercices comptables.
   --------------------------------------------------------------------------- */

/**
 * Les pastilles d'un exercice, et seulement les exceptions.
 *
 * « Active » en est une : un seul exercice l'est à la fois, et c'est celui sur lequel
 * tout s'impute — le savoir d'un coup d'œil est la raison d'être de cet écran. « Clos »
 * aussi : on n'y écrit plus. Les autres années ne se signalent pas.
 */
export const signalementsDExercice = (
  saison: { active: boolean; closed?: boolean; isAutoFilled?: boolean }
): { label: string; variant: 'default' | 'secondary' | 'outline' }[] => {
  const liste: { label: string; variant: 'default' | 'secondary' | 'outline' }[] = [];
  if (saison.active) liste.push({ label: 'Active', variant: 'default' });
  if (saison.closed) liste.push({ label: 'Clos', variant: 'secondary' });
  if (saison.isAutoFilled) liste.push({ label: 'À-nouveau repris', variant: 'outline' });
  return liste;
};

/* ---------------------------------------------------------------------------
   Catégories de produits.
   --------------------------------------------------------------------------- */

/**
 * Le rattachement comptable d'une catégorie de produits, ou son absence.
 *
 * Nommé — « Comptabilité : Volants » — et non posé seul. Les deux libellés sont souvent
 * identiques, et « Volants » sous « Volants » se lit comme une répétition sans objet ;
 * avec son intitulé, la seconde ligne dit ce qu'elle est.
 */
export const rattachementDeProduit = (
  categorie: { accountingCategoryId: number },
  categoriesComptables: readonly { id: number; adminLabel: string }[]
): string => {
  const trouvee = categoriesComptables.find((c) => c.id === categorie.accountingCategoryId);
  return trouvee ? `Comptabilité : ${trouvee.adminLabel}` : 'Sans catégorie comptable';
};

export type GestesDExercice = {
  onSoldes: (id: string) => void;
  onActiver: (id: string) => void;
  onCloturer: (id: string) => void;
};

/**
 * Ce qu'on peut faire d'un exercice.
 *
 * Les soldes viennent en tête : c'est la consultation, le geste le plus fréquent et le
 * seul qui ne change rien — or la première action déclarée est celle qu'un balayage
 * long exécute. Un exercice clos n'offre plus que cela : on n'y écrit plus.
 *
 * La clôture ne porte pas de question ici : l'écran en pose une, et la sienne prévient
 * de l'écrasement des soldes déjà saisis.
 */
export function gestesDExercice(
  saison: { id: string; active: boolean; closed?: boolean },
  gestes: GestesDExercice
): { id: string; label: string; tone?: 'primary' | 'destructive'; run: () => void }[] {
  const liste: { id: string; label: string; tone?: 'primary' | 'destructive'; run: () => void }[] = [
    { id: 'soldes', label: 'Soldes initiaux', tone: 'primary', run: () => gestes.onSoldes(saison.id) }
  ];
  if (saison.closed) return liste;
  if (!saison.active) {
    liste.push({ id: 'activer', label: 'Activer', run: () => gestes.onActiver(saison.id) });
  }
  liste.push({
    id: 'cloturer',
    label: 'Clôturer',
    tone: 'destructive',
    run: () => gestes.onCloturer(saison.id)
  });
  return liste;
}
