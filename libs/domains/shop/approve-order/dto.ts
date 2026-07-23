import { ordersTable } from '../shared/schema';

export type ApproveOrderInput = number;

export type ApproveOrderOutput = typeof ordersTable.$inferSelect;
