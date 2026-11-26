import { Type } from '@sinclair/typebox';

const DAY = '^\\d{4}-\\d{2}-\\d{2}$';

export const listClubFixturesQuerySchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  from: Type.Optional(Type.String({ pattern: DAY })),
  to: Type.Optional(Type.String({ pattern: DAY }))
});
