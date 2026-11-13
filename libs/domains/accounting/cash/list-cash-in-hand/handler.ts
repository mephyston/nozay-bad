import { type Db } from '@nba/db';
import { cashInHand } from '../../shared/cash-store';

export interface CashInHandLine {
  collectorEmail: string;
  collectorName: string;
  count: number;
  totalCents: number;
  /** Date du plus ancien reçu détenu : au-delà de 7 jours, il est temps de remettre. */
  heldSince: string | null;
}

/** Les espèces en circulation, par personne : ce que le trésorier doit aller chercher. */
export async function listCashInHand(db: Db): Promise<CashInHandLine[]> {
  const rows = await cashInHand(db);
  return rows.map((r) => ({
    collectorEmail: r.collectorEmail,
    collectorName: r.collectorName,
    count: r.count,
    totalCents: r.totalCents,
    heldSince: r.oldest ? new Date(r.oldest * 1000).toISOString() : null
  }));
}
