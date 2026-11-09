import { Type } from '@sinclair/typebox';

export const attemptParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
