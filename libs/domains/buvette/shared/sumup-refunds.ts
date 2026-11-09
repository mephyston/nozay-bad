import { AppError } from '@nba/db';
import { sumUpConnection, type SumUpBindings } from './sumup';

/**
 * Rembourser une CB par l'API SumUp, sans passer par l'application.
 *
 * SumUp n'offre aucune clé d'idempotence sur le remboursement : une demande renvoyée après une
 * réponse perdue rembourserait deux fois. Le domaine enregistre donc sa demande avant l'appel,
 * et relit les remboursements déjà passés sur la transaction plutôt que de renvoyer à l'aveugle.
 */
export interface SumUpPayment {
  id: string;
  amountCents: number;
  /** Ce qui est déjà remboursé sur cette transaction, depuis l'API ou depuis l'application. */
  refundedCents: number;
}

export type SumUpRefundOutcome = { outcome: 'done' } | { outcome: 'refused'; message: string } | { outcome: 'unknown' };

export interface SumUpRefunds {
  find(foreignTxId: string): Promise<SumUpPayment | null>;
  refund(transactionId: string, amountCents: number): Promise<SumUpRefundOutcome>;
}

const cents = (euros: unknown) => (typeof euros === 'number' ? Math.round(euros * 100) : 0);

export function readPayment(t: any): SumUpPayment {
  const refunds = Array.isArray(t?.events) ? t.events.filter((e: any) => e?.type === 'REFUND' && e?.status !== 'FAILED') : [];
  return {
    id: String(t.id),
    amountCents: cents(t.amount),
    refundedCents: refunds.reduce((sum: number, e: any) => sum + cents(e.amount), 0)
  };
}

export function createSumUpRefunds(env: SumUpBindings): SumUpRefunds {
  const connection = sumUpConnection(env);
  if (!connection) {
    const off = async (): Promise<never> => {
      throw new AppError("Le remboursement par SumUp n'est pas configuré (SUMUP_API_KEY).", 503);
    };
    return { find: off, refund: off };
  }
  return {
    async find(foreignTxId) {
      const transaction = await connection.transaction(foreignTxId);
      return transaction?.id ? readPayment(transaction) : null;
    },
    async refund(transactionId, amountCents) {
      let res: Response;
      try {
        res = await fetch(`https://api.sumup.com/v0.1/me/refund/${encodeURIComponent(transactionId)}`, {
          method: 'POST',
          headers: { ...connection.headers, 'content-type': 'application/json' },
          body: JSON.stringify({ amount: amountCents / 100 })
        });
      } catch {
        return { outcome: 'unknown' };
      }
      if (res.ok) return { outcome: 'done' };
      if (res.status >= 500) return { outcome: 'unknown' };
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return { outcome: 'refused', message: body?.message || `SumUp a refusé le remboursement (${res.status}).` };
    }
  };
}
