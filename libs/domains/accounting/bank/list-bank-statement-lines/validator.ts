import { Type } from '@sinclair/typebox';

export const listBankStatementLinesQuerySchema = Type.Object({
  /*
   * Facultative, et c'est le point.
   *
   * Une ligne de relevé n'a pas d'exercice : c'est un mouvement daté, et `bank_statement_lines`
   * ne porte aucun `season_id`. Borner la liste à un exercice a du sens pour consulter un
   * historique ; l'imposer ferait disparaître de la file toute ligne datée hors de l'exercice
   * consulté — soit, au 1er septembre, tout ce qui reste à rapprocher de l'année écoulée.
   */
  season: Type.Optional(Type.String({ minLength: 1 })),
  status: Type.Optional(Type.String()),
  accountId: Type.Optional(Type.String()),
  /*
   * Un intervalle explicite, pour les appelants dont la borne n'est pas un exercice.
   *
   * L'archive du rapprochement en est un : elle doit couvrir les exercices encore OUVERTS,
   * et non le seul exercice consulté — une ligne d'août rapprochée en septembre sortait
   * sinon de l'écran à la seconde où on la rapprochait. Le handler savait déjà lire ces
   * bornes ; seule la route ne les laissait pas passer.
   */
  startDate: Type.Optional(Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' })),
  endDate: Type.Optional(Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' })),
  /*
   * Bornes de lecture, en chaînes : Hono ne rend que des chaînes de la requête, et le
   * handler convertit. Sans borne, la liste rend tout ce que les filtres laissent passer.
   */
  limit: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
  offset: Type.Optional(Type.String({ pattern: '^[0-9]+$' }))
});
