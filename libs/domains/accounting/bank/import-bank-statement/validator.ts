import { Type } from '@sinclair/typebox';

export const importBankStatementFormSchema = Type.Object({
  accountId: Type.Optional(Type.String()),
  file: Type.Any()
});
