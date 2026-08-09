<script lang="ts">
  import { Input, Label } from '@nba/ui';
  import type { GalleryBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: GalleryBlock }>();

  // Saisie par identifiants en attendant le sélecteur visuel. Les doublons sont
  // retirés par l'API de toute façon.
  let raw = $state(block.mediaIds.join(', '));
  $effect(() => {
    block.mediaIds = raw
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
  });
</script>

<div>
  <Label for="gallery-ids">Identifiants des images</Label>
  <Input id="gallery-ids" bind:value={raw} placeholder="12, 13, 14" />
  <p class="text-muted-foreground mt-1 text-xs">
    Numéros dans la médiathèque, séparés par des virgules. Le sélecteur visuel arrive
    avec la prochaine tranche.
  </p>
</div>
