import { ordersTable } from '../shared/schema';

export type DeliverOrderInput = number;

export type DeliverOrderOutput = typeof ordersTable.$inferSelect;
