<script lang="ts">
  import { Input, Label, Select } from '@nba/ui';
  import type { EmbedBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: EmbedBlock }>();

  const HINTS: Record<string, string> = {
    youtube: "Identifiant de la vidéo, pas son adresse : dans youtu.be/T4_qiRVEXcI, c'est T4_qiRVEXcI.",
    google_sheet: "Identifiant du document, entre /d/ et /edit dans l'adresse.",
    google_calendar: "Identifiant de l'agenda, de la forme adresse@gmail.com."
  };

  /**
   * Le format du cadre était absent de cet écran alors que le schéma le porte : toute
   * intégration sortait donc en 16/9, y compris un agenda mensuel, qui y est illisible.
   */
  function setAspect(value: string) {
    block.aspect = value as EmbedBlock['aspect'];
    // Une hauteur est obligatoire en taille fixe, et n'a aucun sens autrement : sans
    // ce ménage, une hauteur oubliée resterait dans la charge utile après un retour
    // au 16/9.
    block.heightPx = value === 'fixed' ? (block.heightPx ?? 600) : undefined;
  }
</script>

<div class="space-y-3">
  <div>
    <Label for="embed-provider">Service</Label>
    <Select id="embed-provider" bind:value={block.provider}>
      <option value="youtube">YouTube</option>
      <option value="google_sheet">Google Sheets</option>
      <option value="google_calendar">Google Agenda</option>
    </Select>
  </div>
  <div>
    <Label for="embed-resource">Identifiant</Label>
    <Input id="embed-resource" bind:value={block.resourceId} />
    <p class="text-muted-foreground mt-1 text-xs">{HINTS[block.provider]}</p>
  </div>
  <div>
    <Label for="embed-title">Titre</Label>
    <Input id="embed-title" bind:value={block.title} placeholder="Décrit le contenu pour les lecteurs d'écran" />
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div>
      <Label for="embed-aspect">Format du cadre</Label>
      <Select
        id="embed-aspect"
        value={block.aspect}
        onchange={(e) => setAspect((e.currentTarget as HTMLSelectElement).value)}
      >
        <option value="16/9">16/9 — vidéo</option>
        <option value="4/3">4/3 — plus haut</option>
        <option value="fixed">Hauteur fixe</option>
      </Select>
      <p class="text-muted-foreground mt-1 text-xs">
        16/9 pour une vidéo. Un agenda mensuel ou une grande feuille de calcul demandent
        une hauteur fixe.
      </p>
    </div>

    {#if block.aspect === 'fixed'}
      <div>
        <Label for="embed-height">Hauteur (pixels)</Label>
        <Input
          id="embed-height"
          type="number"
          min="200"
          max="2000"
          value={block.heightPx ?? 600}
          onchange={(e) => (block.heightPx = Number((e.currentTarget as HTMLInputElement).value))}
        />
        <p class="text-muted-foreground mt-1 text-xs">Entre 200 et 2000. Environ 600 pour un agenda.</p>
      </div>
    {/if}
  </div>
</div>
