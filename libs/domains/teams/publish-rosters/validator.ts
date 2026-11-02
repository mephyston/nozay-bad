import { Type } from '@sinclair/typebox';
import { CHAMPIONSHIPS } from '../shared/championship';

export const publishRostersSchema = Type.Object({
  seasonCode: Type.String({ minLength: 1, maxLength: 20 }),
  championship: Type.Union(CHAMPIONSHIPS.map((c) => Type.Literal(c))),
  published: Type.Boolean()
});
