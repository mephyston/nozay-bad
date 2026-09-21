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

export type FiltresDeListe = {
  /** Au moins un critère est posé : la loupe s'allume. */
  actif: boolean;
  ouvrir: () => void;
};

export type RechercheDeListe = {
  placeholder: string;
  /** Le terme actuellement appliqué. Repeuple le champ à sa réouverture. */
  valeur: string;
  /** Appelée à la validation, et avec une chaîne vide à l'effacement. */
  onSubmit: (valeur: string) => void;
  /**
   * Les filtres avancés, atteints par un entonnoir **dans la pilule de recherche**.
   *
   * Pas une action du bouton `+` : celui-ci crée, la loupe réduit. Mettre « Filtrer »
   * à côté de « Nouvelle recette » ferait du `+` un bouton « divers », et c'est ainsi
   * qu'une barre du bas perd son sens. Chercher et filtrer sont la même intention —
   * réduire la liste — donc un seul contrôle, et une pastille qui ne dit qu'une chose.
   */
  filtres?: FiltresDeListe;
};

export type ActionDeListe = {
  id: string;
  /** Sert de nom accessible, et d'intitulé dans le menu au-delà d'une action. */
  libelle: string;
  icone: unknown;
  run: () => void;
};

class DockDePage {
  recherche = $state<RechercheDeListe | null>(null);

  /**
   * Les actions de l'écran. Une seule s'exécute au premier appui ; plusieurs
   * ouvrent un petit menu en verre au-dessus du bouton.
   *
   * La géographie de la barre ne change jamais : le menu à gauche, deux cercles à
   * droite au maximum. Une barre dont la disposition varie d'un écran à l'autre
   * perd la mémoire du pouce.
   */
  actions = $state<ActionDeListe[]>([]);

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

  declarerActions(liste: ActionDeListe[]): () => void {
    this.actions = liste;
    return () => {
      if (this.actions === liste) this.actions = [];
    };
  }
}

export const dockDePage = new DockDePage();
