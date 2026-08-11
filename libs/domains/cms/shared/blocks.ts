import { Type, type Static } from '@sinclair/typebox';

/**
 * Blocs de contenu d'une page.
 *
 * Une page n'est pas un document HTML libre : c'est une suite ordonnée de blocs
 * typés. Le choix est délibéré — un éditeur libre redonnerait au bureau du club les
 * moyens de refaire les pages illisibles de WordPress, et rendrait le rendu
 * impossible à garantir (dimensions d'images, hiérarchie des titres, cadres tiers).
 *
 * Chaque type porte le strict nécessaire, tiré des formes réellement observées sur
 * l'ancien site.
 */

export const BLOCK_TYPES = [
  'richtext',
  'hero',
  'cta_grid',
  'carousel',
  'gallery',
  'embed',
  'person_cards',
  'schedule',
  'pdf_link',
  'posts_feed',
  'columns'
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Lien d'appel à l'action.
 *
 * `mediaId` est ce qui permet à `cta_grid` de servir aussi bien les quatre boutons de
 * l'accueil que la grille de logos des partenaires.
 */
const CtaLink = Type.Object(
  {
    label: Type.String({ minLength: 1, maxLength: 80 }),
    href: Type.String({ minLength: 1, maxLength: 500 }),
    variant: Type.Optional(
      Type.Union([Type.Literal('primary'), Type.Literal('secondary'), Type.Literal('ghost')])
    ),
    mediaId: Type.Optional(Type.Integer({ minimum: 1 })),
    description: Type.Optional(Type.String({ maxLength: 240 }))
  },
  { additionalProperties: false }
);

const Person = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
    role: Type.String({ maxLength: 120 }),
    /** Une responsabilité par entrée. Texte brut : jamais de HTML dans une carte. */
    responsibilities: Type.Array(Type.String({ maxLength: 200 }), { maxItems: 12 }),
    email: Type.Optional(Type.String({ maxLength: 200 })),
    phone: Type.Optional(Type.String({ maxLength: 40 })),
    mediaId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

export const richtextBlockSchema = Type.Object(
  {
    type: Type.Literal('richtext'),
    /** Assaini avec `CMS_PROFILE` avant écriture. L'API fait autorité, pas l'éditeur. */
    html: Type.String({ maxLength: 60000 })
  },
  { additionalProperties: false }
);

export const heroBlockSchema = Type.Object(
  {
    type: Type.Literal('hero'),
    title: Type.String({ minLength: 1, maxLength: 160 }),
    subtitle: Type.Optional(Type.String({ maxLength: 320 })),
    mediaId: Type.Optional(Type.Integer({ minimum: 1 })),
    // L'accueil en porte quatre. Au-delà, ce n'est plus une accroche.
    ctas: Type.Array(CtaLink, { maxItems: 4 })
  },
  { additionalProperties: false }
);

export const ctaGridBlockSchema = Type.Object(
  {
    type: Type.Literal('cta_grid'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    columns: Type.Union([Type.Literal(2), Type.Literal(3), Type.Literal(4)]),
    items: Type.Array(CtaLink, { maxItems: 24 }),
    /**
     * Bannière derrière les boutons.
     *
     * C'est la forme de l'accueil : une image large, les raccourcis posés devant. Le
     * bloc reste utilisable sans elle — une grille de logos de partenaires n'en veut
     * pas — d'où l'optionnalité plutôt qu'un type de bloc distinct.
     */
    backgroundMediaId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

/**
 * Diapositive d'un carrousel : une image, un titre, une phrase, un bouton.
 *
 * Les bornes de longueur ne protègent pas la base — elles protègent la **carte**. Une
 * diapositive fait la même taille que ses voisines quel que soit son contenu ; un
 * titre de 300 caractères ne l'agrandit pas, il la fait déborder. D'où des limites
 * plus serrées qu'ailleurs : 120 pour le titre, 240 pour la description.
 *
 * `minLength` est volontairement absent du titre et `minimum: 0` toléré sur
 * `mediaId` : ces deux cas sont ceux d'une diapositive qu'on vient d'ajouter et pas
 * encore remplie. Les refuser ici produirait « /slides/0/title — Expected string
 * length greater or equal to 1 » à l'écran. C'est `normaliseBlockPayload` qui les
 * refuse, avec une phrase lisible par un bénévole.
 */
const CarouselSlide = Type.Object(
  {
    /** Image de la carte. Le rendu la recadre : toutes les diapositives ont le même format. */
    mediaId: Type.Integer({ minimum: 0 }),
    title: Type.String({ maxLength: 120 }),
    description: Type.Optional(Type.String({ maxLength: 240 })),
    /** Le bouton se pose des deux champs à la fois, ou pas du tout. */
    ctaLabel: Type.Optional(Type.String({ maxLength: 60 })),
    ctaHref: Type.Optional(Type.String({ maxLength: 500 }))
  },
  { additionalProperties: false }
);

/**
 * Carrousel de cartes, en ruban défilant.
 *
 * Distinct de `cta_grid` et non une variante : la grille sert des raccourcis et des
 * logos, où l'image est facultative et le libellé porte tout le sens. Ici l'image est
 * le sujet, et chaque carte porte un texte. Les fondre en un seul bloc obligerait à
 * cacher la moitié des champs derrière un sélecteur de disposition — et à migrer les
 * grilles de partenaires déjà en ligne pour rien.
 *
 * Douze diapositives au maximum : au-delà, les dernières ne sont jamais vues, le
 * ruban étant trop long pour qu'un visiteur en attende la fin.
 */
export const carouselBlockSchema = Type.Object(
  {
    type: Type.Literal('carousel'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    slides: Type.Array(CarouselSlide, { maxItems: 12 })
  },
  { additionalProperties: false }
);

export const galleryBlockSchema = Type.Object(
  {
    type: Type.Literal('gallery'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    mediaIds: Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 60 }),
    layout: Type.Union([Type.Literal('grid'), Type.Literal('carousel')]),
    /**
     * Vignettes par rangée — donc leur taille à l'écran.
     *
     * **Optionnel, et il doit le rester** : les galeries déjà enregistrées ne portent
     * pas ce champ. Le rendre obligatoire ferait échouer `Value.Check` à la relecture,
     * `parseStoredBlock` rendrait `null`, et le bloc **disparaîtrait** des pages en
     * ligne sans un mot. Le rendu retient trois à défaut, la valeur d'avant.
     */
    columns: Type.Optional(
      Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4)])
    )
  },
  { additionalProperties: false }
);

/**
 * Intégration tierce.
 *
 * On ne stocke **jamais** une URL, mais un fournisseur pris dans une liste fermée et
 * un identifiant de ressource. Le rendu reconstruit l'URL. Accepter un `src` libre
 * ferait de chaque écran d'administration un vecteur d'injection de cadre, et la
 * politique de sécurité du site devrait s'ouvrir à n'importe quel domaine.
 */
export const embedBlockSchema = Type.Object(
  {
    type: Type.Literal('embed'),
    provider: Type.Union([
      Type.Literal('youtube'),
      Type.Literal('google_sheet'),
      Type.Literal('google_calendar')
    ]),
    resourceId: Type.String({ minLength: 8, maxLength: 200 }),
    /** Obligatoire : un `<iframe>` sans titre est inaccessible au lecteur d'écran. */
    title: Type.String({ minLength: 1, maxLength: 160 }),
    aspect: Type.Union([Type.Literal('16/9'), Type.Literal('4/3'), Type.Literal('fixed')]),
    heightPx: Type.Optional(Type.Integer({ minimum: 200, maximum: 2000 }))
  },
  { additionalProperties: false }
);

export const personCardsBlockSchema = Type.Object(
  {
    type: Type.Literal('person_cards'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    people: Type.Array(Person, { maxItems: 40 })
  },
  { additionalProperties: false }
);

/**
 * Tableau de créneaux.
 *
 * Le bloc porte une **requête**, jamais des lignes : les créneaux appartiennent au
 * club, pas à la page qui les affiche. C'est `apps/website` qui compose, en
 * interrogeant le domaine des créneaux — le CMS ne le référence pas.
 */
export const scheduleBlockSchema = Type.Object(
  {
    type: Type.Literal('schedule'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    audiences: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 8 }),
    venueId: Type.Optional(Type.Integer({ minimum: 1 })),
    seasonCode: Type.Optional(Type.String({ maxLength: 10 }))
  },
  { additionalProperties: false }
);

export const pdfLinkBlockSchema = Type.Object(
  {
    type: Type.Literal('pdf_link'),
    mediaId: Type.Integer({ minimum: 1 }),
    label: Type.String({ minLength: 1, maxLength: 160 }),
    description: Type.Optional(Type.String({ maxLength: 320 })),
    thumbnailMediaId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

/**
 * Dernières actualités.
 *
 * Comme `schedule`, le bloc porte une **requête** et jamais des articles : la page
 * d'accueil ne fige pas la liste qu'elle affichait le jour de sa dernière
 * publication. C'est `apps/website` qui interroge le domaine au rendu.
 */
export const postsFeedBlockSchema = Type.Object(
  {
    type: Type.Literal('posts_feed'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    /** Six sur l'accueil ; au-delà, la page d'archives fait mieux le travail. */
    limit: Type.Integer({ minimum: 1, maximum: 12 }),
    categorySlug: Type.Optional(Type.String({ maxLength: 120 })),
    showImages: Type.Optional(Type.Boolean()),
    /** Lien « toutes les actualités » sous la grille. */
    showArchiveLink: Type.Optional(Type.Boolean())
  },
  { additionalProperties: false }
);

/**
 * Colonne d'un bloc « Colonnes » : une image facultative, puis du texte riche.
 *
 * L'image est **au-dessus** du texte et non à côté : c'est ce qui permet à la colonne
 * de se replier sans réagencement sous 768 px. La forme observée sur l'ancien site —
 * image à gauche, texte à droite, dans un `td width="45%"` — donne exactement l'inverse,
 * et c'est ce qui rend ces pages illisibles sur téléphone.
 */
const Column = Type.Object(
  {
    /** Texte riche, assaini au profil du site public comme n'importe quel bloc de texte. */
    html: Type.String({ maxLength: 20000 }),
    mediaId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

/**
 * Contenus disposés côte à côte, repliés en pile sur mobile.
 *
 * Le nombre de colonnes n'est pas un champ : c'est `items.length`. Le porter en double
 * ouvrirait la seule incohérence que ce bloc puisse produire — « trois colonnes » avec
 * deux contenus — pour aucun gain.
 *
 * Deux ou trois, jamais quatre : au-delà, chaque colonne devient trop étroite pour du
 * texte sur un écran d'ordinateur portable, et la grille de liens fait mieux le travail.
 */
export const columnsBlockSchema = Type.Object(
  {
    type: Type.Literal('columns'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    items: Type.Array(Column, { minItems: 2, maxItems: 3 })
  },
  { additionalProperties: false }
);

/** Schéma par type, pour valider une charge utile une fois son discriminant connu. */
export const BLOCK_SCHEMAS = {
  richtext: richtextBlockSchema,
  hero: heroBlockSchema,
  cta_grid: ctaGridBlockSchema,
  carousel: carouselBlockSchema,
  gallery: galleryBlockSchema,
  embed: embedBlockSchema,
  person_cards: personCardsBlockSchema,
  schedule: scheduleBlockSchema,
  pdf_link: pdfLinkBlockSchema,
  posts_feed: postsFeedBlockSchema,
  columns: columnsBlockSchema
} as const;

export type RichtextBlock = Static<typeof richtextBlockSchema>;
export type HeroBlock = Static<typeof heroBlockSchema>;
export type CtaGridBlock = Static<typeof ctaGridBlockSchema>;
export type CarouselBlock = Static<typeof carouselBlockSchema>;
export type GalleryBlock = Static<typeof galleryBlockSchema>;
export type EmbedBlock = Static<typeof embedBlockSchema>;
export type PersonCardsBlock = Static<typeof personCardsBlockSchema>;
export type ScheduleBlock = Static<typeof scheduleBlockSchema>;
export type PdfLinkBlock = Static<typeof pdfLinkBlockSchema>;
export type PostsFeedBlock = Static<typeof postsFeedBlockSchema>;
export type ColumnsBlock = Static<typeof columnsBlockSchema>;

export type BlockPayload =
  | RichtextBlock
  | HeroBlock
  | CtaGridBlock
  | CarouselBlock
  | GalleryBlock
  | EmbedBlock
  | PersonCardsBlock
  | ScheduleBlock
  | PdfLinkBlock
  | PostsFeedBlock
  | ColumnsBlock;

export type CtaLinkValue = Static<typeof CtaLink>;
export type CarouselSlideValue = Static<typeof CarouselSlide>;
export type PersonValue = Static<typeof Person>;
export type ColumnValue = Static<typeof Column>;
