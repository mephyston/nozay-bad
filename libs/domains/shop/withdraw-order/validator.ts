import { Type } from '@sinclair/typebox';

export const withdrawOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

/** Le propriétaire attendu, posé par l'espace adhérent depuis la session. */
export const withdrawOrderBodySchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 })
});
