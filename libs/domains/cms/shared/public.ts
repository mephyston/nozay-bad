/**
 * Surface du domaine exposée aux applications de rendu.
 *
 * `index.ts` monte les routeurs Hono et tire tout l'accès base derrière lui : c'est ce
 * qu'il faut à l'API, et exactement ce qu'il ne faut pas embarquer dans le Worker du
 * site public, qui ne parle à la base que par le service binding.
 *
 * Ce fichier ne réexporte donc que le vocabulaire — types de blocs et normalisation
 * d'URL — sans jamais faire entrer Hono ni Drizzle dans le paquet du site.
 */

export {
  BLOCK_TYPES,
  BLOCK_SCHEMAS,
  NESTABLE_BLOCK_TYPES,
  isBlockColumn,
  flattenBlocks
} from './blocks';
export type {
  BlockType,
  BlockPayload,
  RichtextBlock,
  HeroBlock,
  CtaGridBlock,
  CarouselBlock,
  GalleryBlock,
  EmbedBlock,
  PersonCardsBlock,
  ScheduleBlock,
  PdfLinkBlock,
  PostsFeedBlock,
  ColumnsBlock,
  EventsBlock,
  NestableBlockType,
  NestableBlock,
  CtaLinkValue,
  CarouselSlideValue,
  PersonValue,
  ColumnValue,
  TextColumnValue,
  BlockColumnValue
} from './blocks';

export { normalisePath, slugify, buildPath, ROOT_PATH } from './slug';

export {
  isSafeMediaKey,
  MEDIA_KEY_PREFIX,
  VARIANT_WIDTHS,
  VARIANT_FORMATS,
  variantKey
} from './media';

export type { ResolveRouteOutput, ResolveRouteInput } from '../routing/resolve-route/dto';
export type { CmsPageRow, CmsPostRow, CmsPostCategoryRow, CmsMediaRow, CmsMediaVariantRow } from './schema';
