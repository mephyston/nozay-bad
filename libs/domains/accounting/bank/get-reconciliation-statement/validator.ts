import { Type } from '@sinclair/typebox';

export const getReconciliationStatementParamSchema = Type.Object({
  accountCode: Type.String({ minLength: 1, pattern: '^[a-z0-9_-]+$' })
});

export const getReconciliationStatementQuerySchema = Type.Object({
  season: Type.String({ minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' }),
  date: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }))
});
