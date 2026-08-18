import { Type } from '@sinclair/typebox';
import { CLUB_FUNCTIONS } from '../shared/club-functions';

export const saveClubFunctionsParamSchema = Type.Object({
  licence: Type.String({ minLength: 1 })
});

export const saveClubFunctionsBodySchema = Type.Object({
  season: Type.String({ minLength: 1 }),
  // Une fonction au plus : pas de cumul de mandats sur une saison.
  functions: Type.Array(Type.Union(CLUB_FUNCTIONS.map((fn) => Type.Literal(fn))), { maxItems: 1 })
});
