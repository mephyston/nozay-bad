import type { BuvetteSession } from '../shared/schema';

export interface CurrentSession {
  session: BuvetteSession;
  expectedCashCents: number;
  prepaidCents: number;
  salesCount: number;
}
