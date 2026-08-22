import { Type } from '@sinclair/typebox';

export const saveOpenPlayOpenerSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 10 }),
  licence: Type.String({ minLength: 1, maxLength: 20 })
});
