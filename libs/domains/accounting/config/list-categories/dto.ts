import { categoriesTable } from '../../shared/schema';
export type ListCategoriesOutput = (typeof categoriesTable.$inferSelect)[];
