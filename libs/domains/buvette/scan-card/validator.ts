import { Type } from '@sinclair/typebox';

export const scanCardSchema = Type.Object({ qrToken: Type.String({ minLength: 7, maxLength: 500 }) });
