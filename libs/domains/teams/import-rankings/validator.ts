import { Type } from '@sinclair/typebox';

export const importRankingsSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  /** ISO `YYYY-MM-DD` : la date confirmée par le coach dans la prévisualisation. */
  eloDate: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  fileName: Type.Optional(Type.String({ maxLength: 255 }))
});
