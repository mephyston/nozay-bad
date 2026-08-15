<script lang="ts">
  import { Button, CollapsibleSection } from '@nba/ui';
  import type { BlockPayload } from '../../../shared/blocks';
  import { labelOf } from './block-editor-registry';

  import RichtextBlockEditor from './blocks/RichtextBlockEditor.svelte';
  import HeroBlockEditor from './blocks/HeroBlockEditor.svelte';
  import CtaGridBlockEditor from './blocks/CtaGridBlockEditor.svelte';
  import CarouselBlockEditor from './blocks/CarouselBlockEditor.svelte';
  import GalleryBlockEditor from './blocks/GalleryBlockEditor.svelte';
  import EmbedBlockEditor from './blocks/EmbedBlockEditor.svelte';
  import PersonCardsBlockEditor from './blocks/PersonCardsBlockEditor.svelte';
  import ScheduleBlockEditor from './blocks/ScheduleBlockEditor.svelte';
  import PdfLinkBlockEditor from './blocks/PdfLinkBlockEditor.svelte';
  import PostsFeedBlockEditor from './blocks/PostsFeedBlockEditor.svelte';
  import ColumnsBlockEditor from './blocks/ColumnsBlockEditor.svelte';
  import EventsBlockEditor from './blocks/EventsBlockEditor.svelte';

  let {
    block = $bindable(),
    index,
    total,
    media = [],
    canUploadMedia = false,
    targets = [],
    categories = [],
    onMove,
    onRemove
  } = $props<{
    block: BlockPayload;
    index: number;
    total: number;
    /** Ressources de la page hôte, transmises aux éditeurs qui en ont besoin. */
    media?: any[];
    /** `cms:media:write` : autorise le dépôt depuis les sélecteurs. */
    canUploadMedia?: boolean;
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
    categories?: { slug: string; name: string }[];
    onMove: (from: number, to: number) => void;
    onRemove: (index: number) => void;
  }>();
</script>

<div class="border-border rounded-lg border">
  <div class="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
    <span class="text-sm font-medium">{index + 1}. {labelOf(block.type)}</span>
    <div class="flex items-center gap-1">
      {#if index > 0}
        <Button variant="ghost" size="sm" aria-label="Monter" onclick={() => onMove(index, index - 1)}>↑</Button>
      {/if}
      {#if index < total - 1}
        <Button variant="ghost" size="sm" aria-label="Descendre" onclick={() => onMove(index, index + 1)}>↓</Button>
      {/if}
      <Button variant="ghost" size="sm" onclick={() => onRemove(index)}>Retirer</Button>
    </div>
  </div>

  <div class="p-3">
    {#if block.type === 'richtext'}
      <RichtextBlockEditor bind:block {media} {canUploadMedia} {targets} />
    {:else if block.type === 'hero'}
      <HeroBlockEditor bind:block />
    {:else if block.type === 'cta_grid'}
      <CtaGridBlockEditor bind:block {media} {canUploadMedia} {targets} />
    {:else if block.type === 'carousel'}
      <CarouselBlockEditor bind:block {media} {canUploadMedia} {targets} />
    {:else if block.type === 'gallery'}
      <GalleryBlockEditor bind:block {media} {canUploadMedia} />
    {:else if block.type === 'embed'}
      <EmbedBlockEditor bind:block />
    {:else if block.type === 'person_cards'}
      <PersonCardsBlockEditor bind:block />
    {:else if block.type === 'schedule'}
      <ScheduleBlockEditor bind:block />
    {:else if block.type === 'pdf_link'}
      <PdfLinkBlockEditor bind:block {media} {canUploadMedia} />
    {:else if block.type === 'posts_feed'}
      <PostsFeedBlockEditor bind:block {categories} />
    {:else if block.type === 'events'}
      <EventsBlockEditor bind:block />
    {:else if block.type === 'columns'}
      <ColumnsBlockEditor bind:block {media} {canUploadMedia} {targets} />
    {/if}
  </div>
</div>
