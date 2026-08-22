import { Type } from '@sinclair/typebox';

export const claimOpenPlaySessionSchema = Type.Object({
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  firstName: Type.String({ minLength: 1, maxLength: 120 }),
  lastName: Type.String({ minLength: 1, maxLength: 120 })
});
