import { categoriesTable } from '@nba/accounting/schema';

export type ListCategoriesOutput = (typeof categoriesTable.$inferSelect)[];
