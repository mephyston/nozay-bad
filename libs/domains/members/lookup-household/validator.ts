import { Type } from '@sinclair/typebox';

// Identifiant de connexion : email de l'adhérent/parent OU numéro de licence.
export const lookupHouseholdBodySchema = Type.Object({
  identifier: Type.String({ minLength: 1, maxLength: 200 })
});
