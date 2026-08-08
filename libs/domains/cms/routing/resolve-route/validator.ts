import { Type } from '@sinclair/typebox';

export const resolveRouteQuerySchema = Type.Object({
  /** Chemin demandé, tel qu'il arrive du navigateur. Normalisé par le handler. */
  path: Type.String({ minLength: 1, maxLength: 1024 })
});
