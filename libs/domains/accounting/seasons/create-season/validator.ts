import { Type } from '@sinclair/typebox';

export const createSeasonSchema = Type.Object({
  id: Type.Optional(Type.String({ minLength: 1 })),
  code: Type.Optional(Type.String({ minLength: 1 })),
  name: Type.String({ minLength: 1 }),
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
  active: Type.Optional(Type.Boolean())
});
