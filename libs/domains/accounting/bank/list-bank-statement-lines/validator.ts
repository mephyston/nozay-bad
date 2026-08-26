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
  accountId: Type.Optional(Type.String())
});
