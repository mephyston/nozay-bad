import { ordersTable } from '../shared/schema';

export type ApproveOrderInput = number | { id: number; paidAt?: string };

export type ApproveOrderOutput = typeof ordersTable.$inferSelect;
