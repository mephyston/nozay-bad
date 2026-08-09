<script lang="ts">
  import { Input, Label } from '@nba/ui';
  import type { PdfLinkBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: PdfLinkBlock }>();
</script>

<div class="space-y-3">
  <div>
    <Label for="pdf-label">Libellé du lien</Label>
    <Input id="pdf-label" bind:value={block.label} placeholder="Télécharger le livret d'accueil" />
  </div>
  <div>
    <Label for="pdf-media">Identifiant du document</Label>
    <Input id="pdf-media" type="number" bind:value={block.mediaId} />
    <p class="text-muted-foreground mt-1 text-xs">
      Numéro du document dans la médiathèque. Le sélecteur visuel arrive avec la
      prochaine tranche.
    </p>
  </div>
  <div>
    <Label for="pdf-description">Description</Label>
    <Input id="pdf-description" bind:value={block.description} />
  </div>
</div>
