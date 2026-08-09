import { ordersTable } from '../shared/schema';

export type PayOrderInput = number | { id: number; paidAt?: string };

export type PayOrderOutput = typeof ordersTable.$inferSelect;
