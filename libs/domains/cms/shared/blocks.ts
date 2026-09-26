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
  'columns',
  'events',
  'open_play'
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Types qu'une colonne peut héberger.
 *
 * Une liste blanche, et non « tout sauf » : ce qui entre dans une colonne doit
 * savoir vivre dans le tiers d'une page, et chaque ajout ici demande une branche de
 * rendu et un éditeur qui suivent.
 *
 * Sont volontairement absents :
 *  - `richtext` — la colonne « texte » **est** ce bloc, en mieux : elle porte une
 *    image au-dessus. Deux façons de dire la même chose ouvriraient la seule
 *    incohérence que ce bloc puisse produire ;
 *  - `hero` — il porte le `h1` de la page, et l'attend en pleine largeur ;
 *  - `carousel` — ruban pleine largeur, et seul consommateur d'`opensPage` ;
 *  - `columns` — un niveau d'imbrication, pas deux. Au-delà, ce n'est plus une
 *    liste de blocs mais un page-builder, et le rendu cesse d'être garanti ;
 *  - `embed`, `person_cards` — rien ne s'y oppose, ils n'ont simplement pas été
 *    demandés. Les ajouter tient en une entrée ici et une branche dans
 *    `Columns.astro`.
 */
export const NESTABLE_BLOCK_TYPES = [
  'posts_feed',
  'events',
  'schedule',
  'open_play',
  'gallery',
  'pdf_link',
  'cta_grid'
] as const;

export type NestableBlockType = (typeof NESTABLE_BLOCK_TYPES)[number];

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
    ),
    /**
     * Fait défiler le ruban de droite à gauche, en disposition « ruban ».
     *
     * Sans effet en grille, qui n'a rien à faire défiler. **Optionnel** au même titre
     * que `columns`, et pour la même raison : les galeries déjà enregistrées ne le
     * portent pas, et l'exiger les ferait disparaître des pages en ligne.
     */
    autoScroll: Type.Optional(Type.Boolean())
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
    heightPx: Type.Optional(Type.Integer({ minimum: 200, maximum: 2000 })),
    /**
     * Sert la feuille de calcul en **écriture** plutôt qu'en lecture seule.
     *
     * Propre à `google_sheet` ; la normalisation l'écarte des autres fournisseurs, où
     * elle n'aurait aucun sens. Ce que le champ décide n'est qu'une adresse — `/edit`
     * au lieu de `/preview` — mais ses conséquences ne sont pas dans le code : c'est le
     * **partage du document côté Google** qui détermine réellement qui peut écrire. Une
     * feuille ouverte en modification à toute personne disposant du lien devient
     * modifiable par n'importe quel visiteur de la page, sans compte ni trace nominative.
     *
     * **Optionnel, et il doit le rester** : les intégrations déjà enregistrées ne le
     * portent pas.
     */
    editable: Type.Optional(Type.Boolean())
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
    venueId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

/**
 * Agenda du club : les prochains rendez-vous.
 *
 * Comme `schedule` et `posts_feed`, le bloc porte une **requête** et jamais des
 * événements : la page ne fige pas une liste qui vieillirait dès le lendemain. Ce sont
 * les dates réelles qui décident de ce qui s'affiche, à chaque rendu.
 */
export const eventsBlockSchema = Type.Object(
  {
    type: Type.Literal('events'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    /** Six sur une page d'accueil ; au-delà, la page d'agenda fait mieux le travail. */
    limit: Type.Integer({ minimum: 1, maximum: 24 }),
    /** Catégories retenues. Liste vide = toutes, comme pour les publics de `schedule`. */
    categories: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 8 }),
    /** Lien « tout l'agenda » sous la liste. */
    showArchiveLink: Type.Optional(Type.Boolean())
  },
  { additionalProperties: false }
);

/**
 * Jeu libre : les prochaines séances, qui s'y est inscrit, et qui ouvre.
 *
 * Même règle que `events` et `schedule` : le bloc porte une **requête**, jamais des
 * séances. Les inscriptions changent d'heure en heure ; une page qui les figerait
 * mentirait dès le premier inscrit.
 *
 * Ce que le site en montre — « Camille D. », les invités comptés, l'ouvreur ou
 * l'annonce qu'on le cherche encore — n'est pas réglable ici : c'est une décision du
 * club sur des données personnelles, pas un choix de mise en page. Elle vit dans la
 * tranche `list-public-open-play` du domaine des créneaux.
 */
export const openPlayBlockSchema = Type.Object(
  {
    type: Type.Literal('open_play'),
    heading: Type.Optional(Type.String({ maxLength: 160 })),
    /** Six sur une page ; au-delà, l'espace adhérent fait mieux le travail. */
    limit: Type.Integer({ minimum: 1, maximum: 12 })
  },
  { additionalProperties: false }
);

export const pdfLinkBlockSchema = Type.Object(
  {
    type: Type.Literal('pdf_link'),
    mediaId: Type.Integer({ minimum: 1 }),
    label: Type.String({ minLength: 1, maxLength: 160 }),
    description: Type.Optional(Type.String({ maxLength: 320 })),
    thumbnailMediaId: Type.Optional(Type.Integer({ minimum: 1 })),
    /**
     * Affiche le document dans un cadre, **en plus** du lien.
     *
     * Une amélioration, jamais un remplacement : Safari iOS et Chrome Android ne
     * rendent pas un PDF en cadre — selon les versions, un rectangle blanc ou un
     * téléchargement forcé. Le rendu est donc réservé aux écrans larges, et le lien
     * reste le chemin fiable partout.
     *
     * **Optionnel, et il doit le rester** : les blocs déjà enregistrés ne portent pas
     * ce champ. Le rendre obligatoire ferait échouer `Value.Check` à la relecture,
     * `parseStoredBlock` rendrait `null`, et le bloc disparaîtrait des pages en ligne
     * sans un mot.
     */
    preview: Type.Optional(Type.Boolean()),
    /** Hauteur du cadre. Mêmes bornes que `embed`, pour les mêmes raisons de mise en page. */
    previewHeightPx: Type.Optional(Type.Integer({ minimum: 200, maximum: 2000 }))
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
 * Colonne de texte : une image facultative, puis du texte riche.
 *
 * L'image est **au-dessus** du texte et non à côté : c'est ce qui permet à la colonne
 * de se replier sans réagencement sous 768 px. La forme observée sur l'ancien site —
 * image à gauche, texte à droite, dans un `td width="45%"` — donne exactement l'inverse,
 * et c'est ce qui rend ces pages illisibles sur téléphone.
 *
 * **Forme historique, inchangée** : c'est ce qui permet aux colonnes déjà enregistrées
 * de continuer à valider sans migration ni réécriture.
 */
const TextColumn = Type.Object(
  {
    /** Texte riche, assaini au profil du site public comme n'importe quel bloc de texte. */
    html: Type.String({ maxLength: 20000 }),
    mediaId: Type.Optional(Type.Integer({ minimum: 1 }))
  },
  { additionalProperties: false }
);

/**
 * Colonne qui héberge un bloc.
 *
 * Le bloc imbriqué est un bloc ordinaire, décrit par son propre schéma : c'est ce qui
 * permet à l'agenda posé dans une colonne d'être exactement l'agenda, éditeur et rendu
 * compris, plutôt qu'une seconde implémentation qui divergerait au premier changement.
 *
 * L'union est fermée à `NESTABLE_BLOCK_TYPES`. Les deux listes doivent coïncider — un
 * test le vérifie.
 */
const BlockColumn = Type.Object(
  {
    block: Type.Union([
      postsFeedBlockSchema,
      eventsBlockSchema,
      scheduleBlockSchema,
      openPlayBlockSchema,
      galleryBlockSchema,
      pdfLinkBlockSchema,
      ctaGridBlockSchema
    ])
  },
  { additionalProperties: false }
);

/**
 * Une colonne porte du texte, ou un bloc. Jamais les deux.
 *
 * La discrimination ne demande aucun champ inventé : `html` est requis d'un côté,
 * `block` de l'autre, et `additionalProperties: false` des deux côtés ferme la porte
 * aux formes hybrides. Une colonne `{ html }` enregistrée avant cette évolution valide
 * donc toujours, par la première variante.
 */
const Column = Type.Union([TextColumn, BlockColumn]);

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
    items: Type.Array(Column, { minItems: 2, maxItems: 3 }),
    /**
     * Répartition de la largeur, **à deux colonnes seulement**.
     *
     * C'est la forme demandée pour l'accueil : les actualités sur deux tiers, l'agenda
     * sur le dernier. À trois colonnes le champ est ramené à `undefined` par la
     * normalisation — un réglage sans effet qu'une lecture rapide croirait actif est
     * pire que pas de réglage du tout.
     *
     * **Optionnel, et il doit le rester** : les blocs déjà enregistrés ne le portent
     * pas. Le rendre obligatoire ferait échouer `Value.Check` à la relecture,
     * `parseStoredBlock` rendrait `null`, et le bloc **disparaîtrait** des pages en
     * ligne sans un mot. Le rendu retient `equal` à défaut, la valeur d'avant.
     */
    ratio: Type.Optional(
      Type.Union([Type.Literal('equal'), Type.Literal('wide-first'), Type.Literal('wide-last')])
    )
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
  columns: columnsBlockSchema,
  events: eventsBlockSchema,
  open_play: openPlayBlockSchema
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
export type EventsBlock = Static<typeof eventsBlockSchema>;
export type OpenPlayBlock = Static<typeof openPlayBlockSchema>;

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
  | ColumnsBlock
  | EventsBlock
  | OpenPlayBlock;

export type CtaLinkValue = Static<typeof CtaLink>;
export type CarouselSlideValue = Static<typeof CarouselSlide>;
export type PersonValue = Static<typeof Person>;
export type ColumnValue = Static<typeof Column>;
export type TextColumnValue = Static<typeof TextColumn>;
export type BlockColumnValue = Static<typeof BlockColumn>;

/** Le bloc qu'une colonne peut héberger. */
export type NestableBlock = BlockColumnValue['block'];

/** Une colonne porte-t-elle un bloc, plutôt que du texte ? */
export function isBlockColumn(column: ColumnValue): column is BlockColumnValue {
  return 'block' in column;
}

/**
 * Les blocs d'une page, blocs imbriqués dans les colonnes compris.
 *
 * Tout ce qui parcourt une page pour décider d'un chargement — créneaux, agenda,
 * actualités, médias, balisage — doit passer par ici. Un parcours qui ne regarde que le
 * premier niveau laisserait un agenda posé dans une colonne s'afficher vide, sans la
 * moindre erreur pour le signaler.
 *
 * L'ordre est celui de la page : un bloc, puis ce qu'il contient.
 */
export function flattenBlocks(blocks: readonly BlockPayload[]): BlockPayload[] {
  const flat: BlockPayload[] = [];
  for (const block of blocks) {
    flat.push(block);
    if (block.type !== 'columns') continue;
    for (const column of block.items) {
      if (isBlockColumn(column)) flat.push(column.block);
    }
  }
  return flat;
}
