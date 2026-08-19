import { Type } from '@sinclair/typebox';

const emailSchema = Type.String({ minLength: 3, maxLength: 255, pattern: '^[^@\\s]+@[^@\\s]+$' });

export const getPreferencesQuerySchema = Type.Object({
  email: emailSchema
});

export const updatePreferencesBodySchema = Type.Object({
  email: emailSchema,
  // État complet des catégories coupées ; les inconnues sont ignorées côté handler.
  disabled: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 20 })
});
