/**
 * Ce que l'écran courant met dans la barre du bas.
 *
 * La barre vit dans l'îlot du layout ; l'action et la recherche appartiennent à
 * l'écran, dans un autre îlot. Rien ne les relie par les props, d'où ce registre
 * de module : les deux îlots importent `@nba/ui` depuis le même chunk, donc la
 * même instance, et un module ES est unique par URL dans une page.
 *
 * Rien n'est persisté. L'îlot est démonté à chaque navigation douce, et chaque
 * écran redéclare ce qui lui revient à son montage.
 */

export type RechercheDeListe = {
  placeholder: string;
  /** Appelée à la validation, et avec une chaîne vide à l'effacement. */
  onSubmit: (valeur: string) => void;
};

export type ActionDeListe = {
  /** Sert de nom accessible : le bouton n'a qu'une icône. */
  libelle: string;
  icone: unknown;
  run: () => void;
};

class DockDePage {
  recherche = $state<RechercheDeListe | null>(null);
  action = $state<ActionDeListe | null>(null);

  /**
   * Chaque `declarer*` rend de quoi se retirer.
   *
   * Le retrait vérifie que la déclaration est encore la sienne : à la navigation
   * douce, l'écran qui arrive se monte avant que le précédent ne se démonte, et
   * un retrait aveugle effacerait ce qui vient d'être posé.
   */
  declarerRecherche(r: RechercheDeListe): () => void {
    this.recherche = r;
    return () => {
      if (this.recherche === r) this.recherche = null;
    };
  }

  declarerAction(a: ActionDeListe): () => void {
    this.action = a;
    return () => {
      if (this.action === a) this.action = null;
    };
  }
}

export const dockDePage = new DockDePage();
