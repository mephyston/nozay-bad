import { Type } from '@sinclair/typebox';

export const importBankStatementFormSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  accountId: Type.Optional(Type.String()),
  file: Type.Any()
});
