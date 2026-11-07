import { Type } from '@sinclair/typebox';

export const scanCardSchema = Type.Object({ qrToken: Type.String({ minLength: 10, maxLength: 500 }) });
