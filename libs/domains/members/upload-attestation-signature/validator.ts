import { Type } from '@sinclair/typebox';

export const uploadAttestationSignatureSchema = Type.Object({
  signature: Type.String({ minLength: 1 })
});
