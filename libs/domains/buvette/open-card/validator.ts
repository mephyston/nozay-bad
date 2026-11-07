import { Type } from '@sinclair/typebox';

export const openCardSchema = Type.Object({ email: Type.String({ minLength: 3, maxLength: 254, pattern: '^[^@\\s]+@[^@\\s]+$' }) });
