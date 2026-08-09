<script lang="ts">
  import { Input, Label, Select } from '@nba/ui';
  import type { EmbedBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: EmbedBlock }>();

  const HINTS: Record<string, string> = {
    youtube: "Identifiant de la vidéo, pas son adresse : dans youtu.be/T4_qiRVEXcI, c'est T4_qiRVEXcI.",
    google_sheet: "Identifiant du document, entre /d/ et /edit dans l'adresse.",
    google_calendar: "Identifiant de l'agenda, de la forme adresse@gmail.com."
  };
</script>

<div class="space-y-3">
  <div>
    <Label for="embed-provider">Service</Label>
    <Select.Root type="single" bind:value={block.provider}>
      <Select.Trigger id="embed-provider">{block.provider}</Select.Trigger>
      <Select.Content>
        <Select.Item value="youtube">YouTube</Select.Item>
        <Select.Item value="google_sheet">Google Sheets</Select.Item>
        <Select.Item value="google_calendar">Google Agenda</Select.Item>
      </Select.Content>
    </Select.Root>
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
</div>
