export interface SaveItemInput {
  name: string;
  priceCents: number;
  active?: boolean;
  sortOrder?: number;
  icon?: string | null;
}
