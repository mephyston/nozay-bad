import { Type } from '@sinclair/typebox';

export const updateSeasonSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  active: Type.Optional(Type.Boolean()),
  closed: Type.Optional(Type.Boolean())
});
