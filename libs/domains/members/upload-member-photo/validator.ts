import { Type } from '@sinclair/typebox';

/**
 * Le corps est un `multipart/form-data` : il n'est pas validé par TypeBox mais par le
 * handler, qui seul peut juger du type réel et du poids des octets reçus.
 */
export const uploadMemberPhotoParamSchema = Type.Object({
  licence: Type.String({ minLength: 1 })
});
