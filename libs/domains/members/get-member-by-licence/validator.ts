import { Type } from '@sinclair/typebox';

export const getMemberByLicenceParamSchema = Type.Object({
  licence: Type.String({ minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' })
});

export const getMemberByLicenceQuerySchema = Type.Object({
  season: Type.Optional(Type.String())
});
