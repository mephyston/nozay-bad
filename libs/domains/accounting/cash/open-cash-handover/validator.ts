import { Type } from '@sinclair/typebox';

export const openCashHandoverSchema = Type.Object({
  collectorEmail: Type.String({ minLength: 3, maxLength: 200 }),
  countedCents: Type.Integer({ minimum: 0, maximum: 10_000_000 }),
  /** Catégorie où passer l'écart ; exigée seulement s'il y en a un. */
  gapCategoryId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]))
});
