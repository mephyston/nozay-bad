import type { Static } from '@sinclair/typebox';
import type { ordersTable } from '../shared/schema';
import type { updateOrderBodySchema } from './validator';

export type UpdateOrderInput = Static<typeof updateOrderBodySchema>;
export type UpdateOrderOutput = typeof ordersTable.$inferSelect;
