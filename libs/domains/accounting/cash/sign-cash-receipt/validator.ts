import { Type } from '@sinclair/typebox';

export const verifyCodeSchema = Type.Object({ code: Type.String({ pattern: '^[0-9]{4}$' }) });
export const signatureSchema = Type.Object({ signature: Type.String({ minLength: 30, maxLength: 200_000 }) });
