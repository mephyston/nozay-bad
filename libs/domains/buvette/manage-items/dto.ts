export interface SaveItemInput {
  name: string;
  priceCents: number;
  accountingCategoryId: number;
  active?: boolean;
  sortOrder?: number;
}
