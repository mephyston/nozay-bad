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
  'gallery',
  'embed',
  'person_cards',
  'schedule',
  'pdf_link'
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
    items: Type.Array(CtaLink, { maxItems: 24 })
  },
  { additionalProperties: false }
);

export const galleryBlockSchema = Type.Object(
  {
    type: Type.Literal('gallery'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    mediaIds: Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 60 }),
    layout: Type.Union([Type.Literal('grid'), Type.Literal('carousel')])
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

/** Schéma par type, pour valider une charge utile une fois son discriminant connu. */
export const BLOCK_SCHEMAS = {
  richtext: richtextBlockSchema,
  hero: heroBlockSchema,
  cta_grid: ctaGridBlockSchema,
  gallery: galleryBlockSchema,
  embed: embedBlockSchema,
  person_cards: personCardsBlockSchema,
  schedule: scheduleBlockSchema,
  pdf_link: pdfLinkBlockSchema
} as const;

export type RichtextBlock = Static<typeof richtextBlockSchema>;
export type HeroBlock = Static<typeof heroBlockSchema>;
export type CtaGridBlock = Static<typeof ctaGridBlockSchema>;
export type GalleryBlock = Static<typeof galleryBlockSchema>;
export type EmbedBlock = Static<typeof embedBlockSchema>;
export type PersonCardsBlock = Static<typeof personCardsBlockSchema>;
export type ScheduleBlock = Static<typeof scheduleBlockSchema>;
export type PdfLinkBlock = Static<typeof pdfLinkBlockSchema>;

export type BlockPayload =
  | RichtextBlock
  | HeroBlock
  | CtaGridBlock
  | GalleryBlock
  | EmbedBlock
  | PersonCardsBlock
  | ScheduleBlock
  | PdfLinkBlock;

export type CtaLinkValue = Static<typeof CtaLink>;
export type PersonValue = Static<typeof Person>;
