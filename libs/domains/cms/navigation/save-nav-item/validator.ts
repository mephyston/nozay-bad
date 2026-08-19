import { Type } from '@sinclair/typebox';

export const saveNavItemSchema = Type.Object({
  location: Type.Union([Type.Literal('header'), Type.Literal('footer'), Type.Literal('legal')]),
  label: Type.String({ minLength: 1, maxLength: 80 }),
  /**
   * Cible : une page du site **ou** une adresse extérieure, jamais les deux.
   *
   * Le contrôle d'exclusivité est dans le handler : TypeBox saurait l'exprimer par une
   * union, mais le message d'erreur qui en sortirait ne dirait rien d'utilisable.
   */
  pageId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  externalUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  parentId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  position: Type.Optional(Type.Integer({ minimum: 0, maximum: 999 }))
});
