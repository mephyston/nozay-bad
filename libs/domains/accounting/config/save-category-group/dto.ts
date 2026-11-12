import type { CategoryGroupKind } from '../../shared/schema';

export interface CreateCategoryGroupInput {
  kind: CategoryGroupKind;
  label: string;
  position?: number;
  membershipFees?: boolean;
}

export interface UpdateCategoryGroupInput {
  label?: string;
  position?: number;
  membershipFees?: boolean;
}
