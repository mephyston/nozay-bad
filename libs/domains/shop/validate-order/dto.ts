import { ordersTable } from '../shared/schema';

export type ValidateOrderInput = number;

export type ValidateOrderOutput = typeof ordersTable.$inferSelect;
