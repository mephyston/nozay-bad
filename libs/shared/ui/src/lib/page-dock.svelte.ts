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

export type ActionDeListe = {
  id: string;
  /** Sert de nom accessible, et d'intitulé dans le menu au-delà d'une action. */
  libelle: string;
  icone: unknown;
  run: () => void;
};

export type EtatDuDock = {
  recherche: RechercheDeListe | null;
  actions: ActionDeListe[];
};

const CLE = Symbol.for('nba:dock-de-page');
const EVENEMENT = 'nba:dock-de-page';

function etat(): EtatDuDock {
  const hote = globalThis as unknown as Record<symbol, EtatDuDock | undefined>;
  hote[CLE] ??= { recherche: null, actions: [] };
  return hote[CLE]!;
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

  declarerActions(liste: ActionDeListe[]): () => void {
    etat().actions = liste;
    annoncer();
    return () => {
      if (etat().actions === liste) {
        etat().actions = [];
        annoncer();
      }
    };
  },

  /** Prévient à chaque changement. Rend de quoi se désabonner. */
  sAbonner(ecoute: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENEMENT, ecoute);
    return () => window.removeEventListener(EVENEMENT, ecoute);
  },
};
