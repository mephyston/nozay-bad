import { Type } from '@sinclair/typebox';

export const listScheduleSlotsQuerySchema = Type.Object({
  season: Type.Optional(Type.String({ maxLength: 10 })),
  /** Liste séparée par des virgules : `?audiences=minibad,poussins`. */
  audiences: Type.Optional(Type.String({ maxLength: 200 })),
  venue: Type.Optional(Type.String({ pattern: '^[0-9]{1,6}$' }))
});
