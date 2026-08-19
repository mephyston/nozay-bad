import { Type } from '@sinclair/typebox';

export const saveTeamRosterSchema = Type.Object({
  licences: Type.Array(Type.String({ minLength: 1, maxLength: 20 }), { maxItems: 120 })
});
