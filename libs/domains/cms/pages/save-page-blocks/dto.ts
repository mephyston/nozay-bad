import type { BlockType } from '../../shared/blocks';

export interface IncomingBlock {
  type: BlockType;
  /** Charge utile brute, telle qu'envoyée par l'éditeur. Validée par le handler. */
  payload: unknown;
}

export interface SavePageBlocksInput {
  pageId: number;
  blocks: IncomingBlock[];
}

export interface SavePageBlocksOutput {
  pageId: number;
  count: number;
}
