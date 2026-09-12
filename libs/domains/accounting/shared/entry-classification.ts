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

export interface DatedClassifiableEntry extends ClassifiableEntry {
  date: string;
  accrualType?: string | null;
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

/**
 * Vrai si l'écriture compte dans le résultat *arrêté à une date*.
 *
 * Une écriture normale n'est réalisée qu'une fois passée : datée après l'arrêté, elle relève du
 * reste-à-réaliser. Une charge à payer ou un produit à recevoir, non : le motif dit justement
 * que l'argent passera **après** la fin de l'exercice auquel l'écriture se rattache — le
 * validateur refuse d'ailleurs toute autre date. Les borner par l'arrêté revenait à les exclure
 * toujours : quatre charges URSSAF et volants saisies pour 25-26 le 12/09/2026, datées de
 * septembre et d'octobre, manquaient au compte de résultat de 25-26, lu « entier » — c'est-à-dire
 * arrêté au 31/08. Le rattachement à l'exercice est porté par `season_id`, la date de ces
 * écritures n'est qu'une échéance : elles comptent quelle que soit la date d'arrêté.
 *
 * Le bilan de trésorerie, lui, reste filtré par date : il ne les verra qu'à leur passage en banque.
 */
export function countsInProfitAndLossAsOf(
  entry: DatedClassifiableEntry,
  cutoffDate: string,
  legacyTransferCategoryId?: number
): boolean {
  if (!affectsProfitAndLoss(entry, legacyTransferCategoryId)) return false;
  if (entry.accrualType === 'charge_a_payer' || entry.accrualType === 'produit_a_recevoir') return true;
  return entry.date <= cutoffDate;
}
