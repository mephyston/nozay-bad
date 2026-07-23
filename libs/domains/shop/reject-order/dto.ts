import { ordersTable } from '../shared/schema';

export type RejectOrderInput = number;

export type RejectOrderOutput = typeof ordersTable.$inferSelect;
