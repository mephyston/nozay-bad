import type { AmountRow, CategoryRef, FeeBreakdownLine, RubriqueRef } from './dto';

export interface ComputeInput {
  rows: AmountRow[];
  categories: CategoryRef[];
  rubriques: RubriqueRef[];
  memberCount: number;
  /** Catégorie héritée des virements internes : ni produit ni charge. */
  excludedCategoryId?: number;
  withDetails: boolean;
}

export interface ComputeOutput {
  charges: FeeBreakdownLine[];
  resources: FeeBreakdownLine[];
  totalChargesCents: number;
  totalResourcesCents: number;
  membershipFeesCents: number;
}

const AUTRES = 'Autres';

interface Bucket { id: number | null; label: string; position: number; membershipFees: boolean; net: number; byCategory: Map<string, number> }

/**
 * Ramène chaque rubrique à son solde, puis la range du côté des charges ou des ressources.
 *
 * La rubrique des cotisations reste une ressource quel que soit son solde : c'est elle que
 * l'indicateur rapporte au coût d'un adhérent. Une rubrique à solde nul n'apparaît pas.
 */
export function computeFeeBreakdown(input: ComputeInput): ComputeOutput {
  const categories = new Map(input.categories.map((c) => [c.id, c]));
  const rubriques = new Map(input.rubriques.map((r) => [r.id, r]));
  const buckets = new Map<number | null, Bucket>();

  for (const row of input.rows) {
    if (row.categoryId !== null && row.categoryId === input.excludedCategoryId) continue;
    const category = row.categoryId === null ? undefined : categories.get(row.categoryId);
    const rubrique = category?.rubriqueId == null ? undefined : rubriques.get(category.rubriqueId);
    const key = rubrique?.id ?? null;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        id: key,
        label: rubrique?.label ?? AUTRES,
        position: rubrique?.position ?? Number.MAX_SAFE_INTEGER,
        membershipFees: rubrique?.membershipFees ?? false,
        net: 0,
        byCategory: new Map()
      };
      buckets.set(key, bucket);
    }
    const signed = row.type === 'recette' ? row.cents : -row.cents;
    bucket.net += signed;
    const name = category?.adminLabel ?? 'Sans catégorie';
    bucket.byCategory.set(name, (bucket.byCategory.get(name) ?? 0) + signed);
  }

  const ordered = [...buckets.values()].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, 'fr'));
  const chargeBuckets = ordered.filter((b) => !b.membershipFees && b.net < 0);
  const resourceBuckets = ordered.filter((b) => b.membershipFees || b.net > 0);

  const totalChargesCents = chargeBuckets.reduce((s, b) => s - b.net, 0);
  const totalResourcesCents = resourceBuckets.reduce((s, b) => s + b.net, 0);

  const line = (b: Bucket, cents: number, total: number, sign: 1 | -1): FeeBreakdownLine => ({
    id: b.id,
    label: b.label,
    cents,
    perMemberCents: input.memberCount > 0 ? Math.round(cents / input.memberCount) : 0,
    share: total > 0 ? cents / total : 0,
    membershipFees: b.membershipFees,
    ...(input.withDetails
      ? {
          categories: [...b.byCategory.entries()]
            .map(([label, net]) => ({ label, cents: sign * net }))
            .filter((c) => c.cents !== 0)
            .sort((x, y) => y.cents - x.cents)
        }
      : {})
  });

  // Les charges du plus lourd au plus léger : c'est ce que l'on lit d'abord. Les
  // ressources gardent les cotisations en tête, puis l'ordre du bureau.
  const charges = chargeBuckets.map((b) => line(b, -b.net, totalChargesCents, -1)).sort((x, y) => y.cents - x.cents);
  const resources = resourceBuckets
    .map((b) => line(b, b.net, totalResourcesCents, 1))
    .sort((x, y) => Number(y.membershipFees) - Number(x.membershipFees) || y.cents - x.cents);

  const membershipFeesCents = resourceBuckets.filter((b) => b.membershipFees).reduce((s, b) => s + b.net, 0);
  return { charges, resources, totalChargesCents, totalResourcesCents, membershipFeesCents };
}
