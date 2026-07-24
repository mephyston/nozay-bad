import { productsTable } from '../shared/schema';

export interface ListProductsInput { productCategoryId?: number; active?: boolean }

export type ListProductsOutput = (typeof productsTable.$inferSelect)[];
