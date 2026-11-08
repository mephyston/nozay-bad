import { Type } from '@sinclair/typebox';

export const openCardSchema = Type.Object({
  email: Type.String({ minLength: 3, maxLength: 254, pattern: '^[^@\\s]+@[^@\\s]+$' }),
  /** La version des conditions d'utilisation que le client vient d'accepter. */
  termsVersion: Type.Optional(Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' }))
});
