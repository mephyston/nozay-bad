import { Type } from '@sinclair/typebox';

export const createSaleSchema = Type.Object({
  clientId: Type.String({ pattern: '^[A-Za-z0-9-]{8,64}$' }),
  lines: Type.Array(Type.Object({
    itemId: Type.Integer({ minimum: 1 }),
    quantity: Type.Integer({ minimum: 1, maximum: 99 })
  }), { maxItems: 30 }),
  rechargeCents: Type.Optional(Type.Integer({ minimum: 100, maximum: 100000 })),
  rechargeScanToken: Type.Optional(Type.String({ maxLength: 500 })),
  prepaidScanToken: Type.Optional(Type.String({ maxLength: 500 })),
  /** Le complément annoncé à l'écran : si le solde a bougé depuis, la vente est refusée. */
  expectedCashCents: Type.Integer({ minimum: 0, maximum: 1000000 }),
  /** Le reste part vers l'application SumUp au lieu d'être encaissé en espèces. */
  payRestByCard: Type.Optional(Type.Boolean())
});
