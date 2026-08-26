/**
 * Ce qui compte dans le résultat de l'exercice, décidé en un seul endroit.
 *
 * La règle est simple — un virement interne n'est ni un produit ni une charge, il déplace de
 * l'argent sans en créer — mais elle était réécrite à six endroits, et **deux l'oubliaient à
 * moitié**. `forecast-engine.ts` n'excluait que le type `transfert` : les virements saisis sous
 * l'autre forme (deux `recette`/`depense` portant la catégorie « Virements Internes ») entraient
 * dans les poids historiques et dans le « réalisé cash par catégorie » de la prévision de
 * trésorerie. Un virement de 10 000 € vers le livret pesait comme une dépense de fonctionnement.
 *
 * Deux formes, donc deux exclusions à connaître — et une seule oubliée suffisait à fausser un
 * rapport sans le moindre message. D'où ce module : la règle s'énonce ici, et nulle part ailleurs.
 */

export interface ClassifiableEntry {
  type?: string | null;
  categoryId?: number | string | null;
}

export interface CategoryLike {
  id: number;
  adminLabel?: string | null;
  adherentLabel?: string | null;
}

/**
 * L'identifiant de la catégorie « Virements Internes », si elle existe encore.
 *
 * Elle est reconnue **au libellé**, faute de mieux : c'est une donnée de référence que l'écran de
 * configuration laisse renommer. C'était toute la fragilité de l'ancien modèle — renommer la
 * catégorie en minuscules faisait silencieusement remonter tous ces virements en produits et en
 * charges. La reconnaissance est donc large à dessein, et surtout : elle ne sert plus qu'à lire
 * l'historique. Depuis la migration `0023`, la catégorie est inactive et aucune écriture nouvelle
 * ne peut la porter — ce module disparaîtra le jour où les dernières écritures non appariées
 * auront été arbitrées.
 */
export function resolveLegacyTransferCategoryId(categories: CategoryLike[]): number | undefined {
  const matches = (label: string | null | undefined) =>
    !!label && /virement.*interne/i.test(label);
  return categories.find((c) => matches(c.adminLabel) || matches(c.adherentLabel))?.id;
}

/** La catégorie d'une écriture, quelle que soit la forme sous laquelle la projection la rend. */
function categoryIdOf(entry: ClassifiableEntry): number | null {
  const raw = entry.categoryId;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object') return (raw as { id?: number }).id ?? null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Vrai si l'écriture pèse sur le résultat de l'exercice — donc si elle a sa place dans le compte
 * de résultat, dans le budget et dans les projections.
 *
 * Faux pour une jambe de virement (`type === 'transfert'`), et faux pour une écriture portant
 * encore la catégorie héritée. Tout agrégat de produits ou de charges doit passer par ici.
 */
export function affectsProfitAndLoss(
  entry: ClassifiableEntry,
  legacyTransferCategoryId?: number
): boolean {
  if (entry.type === 'transfert') return false;
  if (legacyTransferCategoryId !== undefined && categoryIdOf(entry) === legacyTransferCategoryId) return false;
  return true;
}
