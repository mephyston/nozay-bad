import { Type } from '@sinclair/typebox';

export const listEventsQuerySchema = Type.Object({
  past: Type.Optional(Type.Union([Type.Literal('1'), Type.Literal('0')])),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  /** Adhérent au nom duquel lire, pour connaître l'état de ses propres inscriptions. */
  memberId: Type.Optional(Type.String({ pattern: '^[0-9]{1,9}$' }))
});
