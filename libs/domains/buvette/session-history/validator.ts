import { Type } from '@sinclair/typebox';

export const sessionIdParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
