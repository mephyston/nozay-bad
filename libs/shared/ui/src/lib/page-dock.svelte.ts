/**
 * Ce que l'écran courant met dans la barre du bas.
 *
 * La barre vit dans l'îlot du layout ; l'action et la recherche appartiennent à
 * l'écran, dans un autre îlot. Rien ne les relie par les props.
 *
 * **Ni par un état de module.** C'était la première conception, et elle a tenu
 * jusqu'à ce qu'un écran de plus fasse dupliquer le chunk : `declarerActions` s'est
 * retrouvé défini quatre fois dans le bundle, l'écran des adhérents parlant à une
 * copie et la barre à une autre — les actions n'arrivaient jamais. Le regroupement
 * des chunks n'est pas une garantie sur laquelle bâtir.
 *
 * L'état vit donc sur `globalThis`, sous une clé `Symbol.for` — partagée entre
 * toutes les copies du module — et les changements se signalent par un événement du
 * document, qui traverse les frontières de module quoi qu'en fasse le bundler.
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
   * qu'une barre du bas perd son sens.
   */
  filtres?: FiltresDeListe;
};

/**
 * Une action de la barre du bas.
 *
 * Mêmes noms de champs que `SwipeAction` — `label`, `icon` — et ce n'est pas un
 * détail de style : les écrans déclarent souvent les deux à partir des mêmes
 * données, et deux vocabulaires pour un même objet avaient produit un menu de deux
 * entrées vides. `tsc` ne lit pas les `.svelte`, donc rien ne l'avait signalé.
 */
export type ActionDeListe = {
  id: string;
  /** Sert de nom accessible, et d'intitulé dans le menu au-delà d'une action. */
  label: string;
  icon?: unknown;
  run: () => void;
};

/**
 * La **portée** de l'écran : ce qu'on regarde, et non ce qu'on y cherche.
 *
 * L'exercice d'un rapport financier en est l'exemple : il ne réduit pas ce qu'on lit
 * — ce que fait la loupe — et il ne crée rien — ce que fait le `+`. Le loger dans l'un
 * ou l'autre brouille les deux : une barre du bas perd son sens dès qu'un de ses
 * boutons devient « divers ». Il lui faut donc sa place, et elle affiche la valeur
 * courante, parce qu'une portée qu'on ne voit pas ne se vérifie jamais.
 */
export type PorteeDeListe = {
  /** Nom accessible du bouton : « Exercice », « Compte ». */
  label: string;
  /** Ce qui s'affiche dans la pilule. Court : « 25-26 », pas « Saison 2025-2026 ». */
  valeur: string;
  ouvrir: () => void;
};

/**
 * Comment le bouton d'actions se présente quand il en porte plusieurs.
 *
 * Par défaut un `+` : c'est la vérité des listes, où ces actions créent. Elle ne l'est
 * plus sur un rapport financier, dont les deux gestes impriment — un `+` y annonce une
 * création qui n'existe pas. L'écran qui sait le dit.
 */
export type GroupeDActions = {
  icon?: unknown;
  /** Nom accessible du bouton : « Ajouter » par défaut. */
  label?: string;
};

export type EtatDuDock = {
  recherche: RechercheDeListe | null;
  /**
   * Les portées de l'écran, dans l'ordre où elles ont été déclarées.
   *
   * Plusieurs, parce qu'un écran en a souvent deux : la saison qu'on lit **et** la
   * journée du championnat, ou la date des classements. Tant qu'il n'y avait qu'un
   * emplacement, la seconde déclaration écrasait la première — et la saison se
   * retrouvait reléguée dans le menu des créations, à côté de « Créer une équipe »,
   * ce qu'elle n'est pas.
   */
  portees: PorteeDeListe[];
  actions: ActionDeListe[];
  groupe: GroupeDActions | null;
};

/**
 * Une déclaration d'actions, et qui l'a faite.
 *
 * Plusieurs composants d'un même écran en déclarent : la liste pose ses créations, le
 * sélecteur de saison pose la sienne. Tant que `declarerActions` écrasait, le dernier
 * monté effaçait l'autre — et selon l'ordre de montage, c'était tantôt l'un, tantôt
 * l'autre qui disparaissait.
 */
type Declaration = { liste: ActionDeListe[]; groupe: GroupeDActions | null };

const CLE = Symbol.for('nba:dock-de-page');
const EVENEMENT = 'nba:dock-de-page';

type Interne = EtatDuDock & { declarations: Declaration[] };

function etat(): Interne {
  const hote = globalThis as unknown as Record<symbol, Interne | undefined>;
  hote[CLE] ??= { recherche: null, portees: [], actions: [], groupe: null, declarations: [] };
  return hote[CLE]!;
}

/**
 * Recompose la liste visible à partir des déclarations en cours.
 *
 * L'ordre est celui des déclarations, et le groupe est celui de la **première** qui en
 * fournit un : c'est l'écran qui se monte d'abord, donc celui dont le geste est
 * principal. Un sélecteur de saison qui arrive ensuite ne renomme pas le bouton.
 */
function recomposer(): void {
  const e = etat();
  e.actions = e.declarations.flatMap((d) => d.liste);
  e.groupe = e.declarations.find((d) => d.groupe)?.groupe ?? null;
}

function annoncer(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENEMENT));
}

export const dockDePage = {
  /** L'état courant. À relire à chaque notification. */
  lire(): EtatDuDock {
    return etat();
  },

  /**
   * Chaque `declarer*` rend de quoi se retirer.
   *
   * Le retrait vérifie que la déclaration est encore la sienne : à la navigation
   * douce, l'écran qui arrive se monte avant que le précédent ne se démonte, et un
   * retrait aveugle effacerait ce qui vient d'être posé.
   */
  declarerRecherche(r: RechercheDeListe): () => void {
    etat().recherche = r;
    annoncer();
    return () => {
      if (etat().recherche === r) {
        etat().recherche = null;
        annoncer();
      }
    };
  },

  declarerPortee(p: PorteeDeListe): () => void {
    etat().portees.push(p);
    annoncer();
    return () => {
      const liste = etat().portees;
      const rang = liste.indexOf(p);
      // Retrait ciblé : à la navigation douce, l'écran qui arrive se monte avant que
      // le précédent ne se démonte, et un retrait aveugle effacerait ce qui vient
      // d'être posé.
      if (rang === -1) return;
      liste.splice(rang, 1);
      annoncer();
    };
  },

  declarerActions(liste: ActionDeListe[], groupe?: GroupeDActions): () => void {
    const declaration: Declaration = { liste, groupe: groupe ?? null };
    etat().declarations.push(declaration);
    recomposer();
    annoncer();
    return () => {
      const e = etat();
      const rang = e.declarations.indexOf(declaration);
      // Retrait ciblé : à la navigation douce, l'écran qui arrive se monte avant que le
      // précédent ne se démonte, et un retrait aveugle effacerait ce qui vient d'être posé.
      if (rang === -1) return;
      e.declarations.splice(rang, 1);
      recomposer();
      annoncer();
    };
  },

  /** Prévient à chaque changement. Rend de quoi se désabonner. */
  sAbonner(ecoute: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENEMENT, ecoute);
    return () => window.removeEventListener(EVENEMENT, ecoute);
  },
};
