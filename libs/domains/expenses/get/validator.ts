import { Type } from '@sinclair/typebox';

export const getAttachmentParamsSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' }),
  attachmentId: Type.String({ pattern: '^[0-9]+$' })
});
