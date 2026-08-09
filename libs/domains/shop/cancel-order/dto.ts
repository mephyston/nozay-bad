import { ordersTable } from '../shared/schema';

export type CancelOrderInput = number;

export type CancelOrderOutput = typeof ordersTable.$inferSelect;
