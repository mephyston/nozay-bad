import { AppError } from '@nba/db';

/** L'identifiant d'une tentative, unique chez SumUp sur tout le compte marchand. */
export function newForeignTxId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `buv-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export const FOREIGN_TX_ID_PATTERN = '^buv-[0-9a-f]{32}$';

export interface SumUpTransaction {
  status: 'successful' | 'failed' | 'pending' | 'unknown';
  amountCents?: number;
  currency?: string;
  transactionCode?: string;
}

export type SumUpLookup = (foreignTxId: string) => Promise<SumUpTransaction>;

export interface SumUpBindings {
  SUMUP_API_KEY?: string;
  SUMUP_MERCHANT_CODE?: string;
}

const FAILED_STATUSES = new Set(['FAILED', 'CANCELLED', 'REFUNDED']);

/** Une transaction déjà remboursée n'est pas un paiement acquis : elle compte comme un échec. */
export function readTransaction(t: any): SumUpTransaction {
  const raw = String(t?.status ?? '').toUpperCase();
  const simple = String(t?.simple_status ?? '').toUpperCase();
  const paid = raw === 'SUCCESSFUL' || simple === 'SUCCESSFUL' || simple === 'PAID_OUT';
  // Un statut inattendu n'est pas un échec : conclure trop vite autoriserait un second débit.
  const status = paid ? 'successful' : FAILED_STATUSES.has(raw) ? 'failed' : 'pending';
  return {
    status,
    amountCents: typeof t?.amount === 'number' ? Math.round(t.amount * 100) : undefined,
    currency: t?.currency,
    transactionCode: t?.transaction_code
  };
}

/**
 * L'API de SumUp est la seule à faire foi : le retour de l'application passe par le navigateur
 * et peut être forgé. La clé reste dans ce Worker et donne un accès large au compte : elle n'en
 * sort jamais, pas même dans un message d'erreur.
 */
/** La clé et le code marchand, résolu une fois : partagés par la vérification et le remboursement. */
export function sumUpConnection(env: SumUpBindings) {
  const key = env.SUMUP_API_KEY;
  if (!key) return null;
  const headers = { authorization: `Bearer ${key}` };
  let merchantCode = env.SUMUP_MERCHANT_CODE;
  return {
    headers,
    async merchantCode(): Promise<string> {
      if (!merchantCode) {
        const me = await fetch('https://api.sumup.com/v0.1/me', { headers });
        if (!me.ok) throw new AppError('SumUp ne répond pas : réessayez dans un instant.', 502);
        merchantCode = ((await me.json()) as any)?.merchant_profile?.merchant_code;
        if (!merchantCode) throw new AppError('Code marchand SumUp introuvable.', 502);
      }
      return merchantCode!;
    },
    /** La transaction d'une tentative, ou `null` si SumUp ne la connaît pas. */
    async transaction(foreignTxId: string): Promise<any | null> {
      const code = encodeURIComponent(await this.merchantCode());
      const res = await fetch(
        `https://api.sumup.com/v2.1/merchants/${code}/transactions?foreign_transaction_id=${encodeURIComponent(foreignTxId)}`,
        { headers }
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new AppError('SumUp ne répond pas : réessayez dans un instant.', 502);
      return res.json();
    }
  };
}

export function createSumUpClient(env: SumUpBindings): SumUpLookup {
  const connection = sumUpConnection(env);
  if (!connection) {
    return async () => {
      throw new AppError("La vérification des CB n'est pas configurée (SUMUP_API_KEY).", 503);
    };
  }
  return async (foreignTxId) => {
    const transaction = await connection.transaction(foreignTxId);
    return transaction ? readTransaction(transaction) : { status: 'unknown' };
  };
}
