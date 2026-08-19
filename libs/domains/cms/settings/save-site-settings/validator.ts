import { Type } from '@sinclair/typebox';

/**
 * Les longueurs maximales sont celles au-delà desquelles le pied de page cesse d'être
 * un pied de page. Le contrôle de forme des adresses (http/https) vit dans le handler,
 * avec `isSafeHref` : c'est la même règle que pour une entrée de menu, et elle n'a pas
 * à être réécrite en schéma.
 */
export const saveSiteSettingsSchema = Type.Object({
  footerDescription: Type.String({ maxLength: 200 }),
  footerAddress: Type.String({ maxLength: 200 }),
  instagramUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  facebookUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()]))
});
