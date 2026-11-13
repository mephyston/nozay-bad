import { Type } from '@sinclair/typebox';

export const confirmHandoverSchema = Type.Object({ qr: Type.String({ minLength: 10, maxLength: 200 }) });
export const handoverSignatureSchema = Type.Object({ signature: Type.String({ minLength: 30, maxLength: 200_000 }) });
