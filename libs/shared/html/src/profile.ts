import { escapeAttribute, decodeEntities, isSafeHref, isSameOriginPath } from './entities';

/**
 * Profils d'assainissement du texte riche.
 *
 * Le même moteur de balayage sert deux usages qui n'ont pas les mêmes besoins : une
 * annonce est un message court (gras, listes, un lien), une page de site est un
 * document (titres, tableaux, images). Plutôt que d'élargir la liste blanche pour
 * tout le monde — ce qui reviendrait à donner à l'éditeur d'annonces des pouvoirs
 * dont il n'a que faire — chaque appelant choisit son profil.
 */

/**
 * Règle portant sur un attribut.
 *
 * `sanitize` renvoie la valeur à écrire (déjà échappée) ou `null` pour la refuser.
 * Un refus sur un attribut `required` fait **déballer** la balise : le contenu reste,
 * la balise saute — c'est le comportement d'un lien sans `href` acceptable.
 */
export interface AttributeSpec {
  readonly sanitize: (rawValue: string) => string | null;
  readonly required?: boolean;
}

export interface TagSpec {
  /**
   * Attributs conservés. L'ordre de déclaration est l'ordre d'écriture : la sortie
   * reste ainsi stable d'une exécution à l'autre, donc comparable en test.
   */
  readonly attributes?: Readonly<Record<string, AttributeSpec>>;
  /** Attributs imposés d'office, calculés depuis ceux retenus (invariants de sécurité). */
  readonly derive?: (kept: Readonly<Record<string, string>>) => Record<string, string>;
}

export interface SanitizeProfile {
  /** Balises conservées telles quelles. Tout le reste est déballé ou supprimé. */
  readonly allowedTags: ReadonlySet<string>;
  /** Balises sans contenu ni fermeture. */
  readonly voidTags: ReadonlySet<string>;
  /** Équivalences ramenant un balisage de présentation vers son équivalent sémantique. */
  readonly tagAliases: Readonly<Record<string, string>>;
  /** Balises dont le **contenu** doit disparaître avec elles. */
  readonly strippedSubtrees: ReadonlySet<string>;
  /** Politique d'attributs, par balise. Une balise absente n'en conserve aucun. */
  readonly tags: Readonly<Record<string, TagSpec>>;
}

// ---------------------------------------------------------------------------
// Fabriques d'attributs
// ---------------------------------------------------------------------------

/** Lien : liste blanche de schémas, décodée avant jugement. */
const hrefAttribute: AttributeSpec = {
  required: true,
  sanitize: (raw) => (isSafeHref(raw) ? escapeAttribute(decodeEntities(raw).trim()) : null)
};

/** Image : uniquement nos propres médias (voir `isSameOriginPath`). */
const mediaSrcAttribute: AttributeSpec = {
  required: true,
  sanitize: (raw) =>
    isSameOriginPath(raw, '/media/') ? escapeAttribute(decodeEntities(raw).trim()) : null
};

/** Entier positif borné : `width`, `height`, `colspan`, `rowspan`. */
function numericAttribute(max: number): AttributeSpec {
  return {
    sanitize: (raw) => {
      const value = Number.parseInt(decodeEntities(raw).trim(), 10);
      if (!Number.isSafeInteger(value) || value <= 0 || value > max) return null;
      return String(value);
    }
  };
}

/** Ancre de titre, réduite à un identifiant inoffensif. */
const slugAttribute: AttributeSpec = {
  sanitize: (raw) => {
    const value = decodeEntities(raw).trim().toLowerCase();
    return /^[a-z0-9-]{1,64}$/.test(value) ? value : null;
  }
};

/** Texte libre court (`alt` d'une image, légende) : conservé, échappé. */
function textAttribute(maxLength: number): AttributeSpec {
  return {
    sanitize: (raw) => escapeAttribute(decodeEntities(raw).trim().slice(0, maxLength))
  };
}

/**
 * Alignement d'un bloc, porté par une classe et non par un `style`.
 *
 * Une classe se vérifie contre une liste fermée ; un `style` demanderait d'analyser
 * du CSS pour distinguer `text-align:center` de tout ce qu'on ne veut pas voir
 * arriver. `document.execCommand('justifyCenter')` produit justement un `style`, d'où
 * le centrage posé à la main par l'éditeur.
 *
 * Le nom est préfixé — jamais `text-center` : la classe voyage dans du HTML stocké,
 * que Tailwind ne balaie pas, donc l'utilitaire de même nom ne serait pas généré. La
 * règle est écrite explicitement dans les feuilles du site et de l'éditeur.
 */
const blockClassAttribute: AttributeSpec = {
  sanitize: (raw) => (decodeEntities(raw).trim() === 'nba-center' ? 'nba-center' : null)
};

/** Valeur contrainte à une liste fermée. */
function enumAttribute(values: readonly string[]): AttributeSpec {
  return {
    sanitize: (raw) => {
      const value = decodeEntities(raw).trim().toLowerCase();
      return values.includes(value) ? value : null;
    }
  };
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

/**
 * Annonces du club : un message, pas un document.
 *
 * Gras, italique, souligné, listes, un lien. Volontairement pauvre — c'est le
 * comportement d'origine, et les tests de `libs/domains/announcements` en font foi.
 */
export const ANNOUNCEMENT_PROFILE: SanitizeProfile = {
  allowedTags: new Set(['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']),
  voidTags: new Set(['br']),
  // `document.execCommand` émet encore l'ancien balisage de présentation.
  tagAliases: { b: 'strong', i: 'em', div: 'p' },
  strippedSubtrees: new Set(['script', 'style', 'iframe', 'noscript', 'template', 'svg', 'math']),
  tags: {
    a: { attributes: { href: hrefAttribute } }
  }
};

/**
 * Pages et articles du site public : un document.
 *
 * S'ajoutent les titres (jamais `h1` — c'est le titre de la page, unique par
 * document), les tableaux (grille tarifaire), les images et les citations. Le `src`
 * d'une image est restreint à `/media/…` : une URL distante est refusée, ce qui
 * élimine d'un geste les pixels de suivi, le contenu mixte et le hotlinking.
 */
export const CMS_PROFILE: SanitizeProfile = {
  allowedTags: new Set([
    'p', 'br', 'strong', 'em', 'u', 's', 'del', 'sup', 'sub', 'a',
    'ul', 'ol', 'li',
    'h2', 'h3', 'h4',
    'blockquote', 'hr',
    'figure', 'figcaption', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ]),
  voidTags: new Set(['br', 'hr', 'img']),
  tagAliases: { b: 'strong', i: 'em', div: 'p', strike: 'del', h1: 'h2', h5: 'h4', h6: 'h4' },
  strippedSubtrees: new Set(['script', 'style', 'iframe', 'noscript', 'template', 'svg', 'math']),
  tags: {
    a: {
      attributes: { href: hrefAttribute, target: enumAttribute(['_blank']) },
      // Un `target="_blank"` sans `rel` donne à la page ouverte une référence
      // `window.opener` sur la nôtre. L'invariant est imposé ici, jamais lu de l'entrée.
      derive: (kept): Record<string, string> =>
        kept.target === '_blank' ? { rel: 'noopener noreferrer' } : {}
    },
    img: {
      attributes: {
        src: mediaSrcAttribute,
        alt: textAttribute(300),
        width: numericAttribute(10000),
        height: numericAttribute(10000)
      },
      // Hors de la zone visible au chargement, et jamais bloquant pour le rendu.
      derive: () => ({ loading: 'lazy', decoding: 'async' })
    },
    // `class` n'accepte que l'alignement centré (voir `blockClassAttribute`) : ce n'est
    // pas une ouverture à la mise en forme libre, mais un attribut à valeur unique.
    p: { attributes: { class: blockClassAttribute } },
    h2: { attributes: { id: slugAttribute, class: blockClassAttribute } },
    h3: { attributes: { id: slugAttribute, class: blockClassAttribute } },
    h4: { attributes: { id: slugAttribute, class: blockClassAttribute } },
    figure: { attributes: { class: blockClassAttribute } },
    blockquote: { attributes: { class: blockClassAttribute } },
    th: { attributes: { colspan: numericAttribute(64), rowspan: numericAttribute(64) } },
    td: { attributes: { colspan: numericAttribute(64), rowspan: numericAttribute(64) } }
  }
};
