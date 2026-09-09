import { ordersTable } from '../shared/schema';

export type UnpayOrderInput = number;

export type UnpayOrderOutput = typeof ordersTable.$inferSelect;
