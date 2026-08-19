import { Type } from '@sinclair/typebox';

/**
 * Le fichier arrive en `multipart/form-data` : seules les métadonnées qui
 * l'accompagnent sont validées ici, les octets sont lus par la route.
 */
export const uploadMediaMetaSchema = Type.Object({
  width: Type.Optional(Type.String({ pattern: '^[0-9]{1,5}$' })),
  height: Type.Optional(Type.String({ pattern: '^[0-9]{1,5}$' })),
  alt: Type.Optional(Type.String({ maxLength: 300 })),
  title: Type.Optional(Type.String({ maxLength: 200 }))
});
