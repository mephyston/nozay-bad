import { productsTable } from '../shared/schema';

export interface ListProductsInput { category?: string; active?: boolean }

export type ListProductsOutput = (typeof productsTable.$inferSelect)[];
