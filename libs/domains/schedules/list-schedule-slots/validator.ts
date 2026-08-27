import { Type } from '@sinclair/typebox';

export const listScheduleSlotsQuerySchema = Type.Object({
  /** Liste séparée par des virgules : `?audiences=minibad,poussins`. */
  audiences: Type.Optional(Type.String({ maxLength: 200 })),
  venue: Type.Optional(Type.String({ pattern: '^[0-9]{1,6}$' }))
});
