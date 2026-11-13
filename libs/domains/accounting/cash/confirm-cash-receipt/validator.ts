import { Type } from '@sinclair/typebox';

/**
 * Le storefront transmet ce que dit la session : l'adresse du foyer et ses adhésions.
 * L'API refuse un reçu qui n'est pas pour l'une d'elles.
 */
export const confirmCashReceiptSchema = Type.Object({
  qr: Type.String({ minLength: 10, maxLength: 200 }),
  email: Type.String({ minLength: 3, maxLength: 200 }),
  memberIds: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, maxItems: 20 })
});
