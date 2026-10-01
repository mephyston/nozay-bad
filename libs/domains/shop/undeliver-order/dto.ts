import { ordersTable } from '../shared/schema';

export type UndeliverOrderInput = number;

export type UndeliverOrderOutput = typeof ordersTable.$inferSelect;
