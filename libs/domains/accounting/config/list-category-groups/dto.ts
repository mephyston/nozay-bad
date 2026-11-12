import type { CategoryGroupKind } from '../../shared/schema';

/** Un pôle ou une rubrique, avec le nombre de catégories qui s'y rangent. */
export interface CategoryGroupOutput {
  id: number;
  kind: CategoryGroupKind;
  label: string;
  position: number;
  membershipFees: boolean;
  categoryCount: number;
}
