import { Type } from '@sinclair/typebox';

export const updateAttestationConfigSchema = Type.Object({
  signatoryName: Type.String({ minLength: 1, maxLength: 120 }),
  signatoryEmail: Type.String({ minLength: 3, maxLength: 200 }),
  websiteUrl: Type.String({ minLength: 1, maxLength: 200 })
});
