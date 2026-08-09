import { Type } from '@sinclair/typebox';

export const reorderNavItemsSchema = Type.Object({
  /** Identifiants dans l'ordre voulu, pour une seule fratrie. */
  ids: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, maxItems: 100 })
});
