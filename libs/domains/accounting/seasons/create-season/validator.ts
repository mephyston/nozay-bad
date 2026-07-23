import { Type } from '@sinclair/typebox';

export const createSeasonSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  active: Type.Optional(Type.Boolean())
});
