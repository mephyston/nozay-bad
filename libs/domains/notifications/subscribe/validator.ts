import { Type } from '@sinclair/typebox';

/**
 * `email` est injecté par le BFF storefront depuis la session signée, jamais repris
 * du corps envoyé par le navigateur : l'API n'est atteignable qu'avec la clé interne.
 *
 * L'endpoint vient du navigateur mais transite par le client : il est contraint au
 * HTTPS et à une longueur bornée, car c'est le Worker qui le contactera ensuite.
 */
export const subscribeBodySchema = Type.Object({
  email: Type.String({ minLength: 3, maxLength: 255, pattern: '^[^@\\s]+@[^@\\s]+$' }),
  endpoint: Type.String({ minLength: 12, maxLength: 1024, pattern: '^https://' }),
  keys: Type.Object({
    p256dh: Type.String({ minLength: 1, maxLength: 255 }),
    auth: Type.String({ minLength: 1, maxLength: 255 })
  }),
  userAgent: Type.Optional(Type.String({ maxLength: 255 }))
});
