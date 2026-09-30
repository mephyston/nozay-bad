import { ordersTable } from '../shared/schema';

export type RejectOrderInput = {
  id: number;
  /** Motif expliqué à l'adhérent ; vide ou absent, le refus reste muet comme avant. */
  reason?: string | null;
};

export type RejectOrderOutput = typeof ordersTable.$inferSelect;
