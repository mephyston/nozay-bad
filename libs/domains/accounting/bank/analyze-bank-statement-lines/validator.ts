import { Type } from '@sinclair/typebox';

export const analyzeBankStatementLinesQuerySchema = Type.Object({
  season: Type.String({ minLength: 1 }),
  id: Type.Optional(Type.String())
});
