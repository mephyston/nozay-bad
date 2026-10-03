import type { Static } from '@sinclair/typebox';
import type { ordersTable } from '../shared/schema';
import type { amendOrderBodySchema } from './validator';

export type AmendOrderInput = Static<typeof amendOrderBodySchema>;
export type AmendOrderOutput = typeof ordersTable.$inferSelect;
