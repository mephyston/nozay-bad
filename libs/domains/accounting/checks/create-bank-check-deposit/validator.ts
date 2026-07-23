import { Type } from '@sinclair/typebox';

export const createCheckDepositSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  reference: Type.String({ minLength: 1 }),
  date: Type.String({ minLength: 1 }),
  checkIds: Type.Array(Type.Number())
});

export const clearCheckDepositSchema = Type.Object({
  bankTransactionId: Type.Number()
});
