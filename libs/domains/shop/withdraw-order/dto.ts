import type { Static } from '@sinclair/typebox';
import type { ordersTable } from '../shared/schema';
import type { withdrawOrderBodySchema } from './validator';

export type WithdrawOrderInput = { id: number } & Static<typeof withdrawOrderBodySchema>;
export type WithdrawOrderOutput = typeof ordersTable.$inferSelect;
