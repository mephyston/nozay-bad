<script lang="ts">
  import { Table } from '@nba/ui';

  let {
    csvPreview = [],
    separator = ';'
  }: {
    csvPreview: any[];
    separator: string;
  } = $props();
</script>

<div class="mt-6 space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold">Aperçu des données (5 premières lignes)</h3>
    <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
      Séparateur : {separator === ';' ? 'Point-virgule' : 'Virgule'}
    </span>
  </div>
  <div class="border border-border rounded-md overflow-hidden bg-background">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="h-9 py-1 px-3">Licence</Table.Head>
          <Table.Head class="h-9 py-1 px-3">Saison</Table.Head>
          <Table.Head class="h-9 py-1 px-3">Nom</Table.Head>
          <Table.Head class="h-9 py-1 px-3">Prénom</Table.Head>
          <Table.Head class="h-9 py-1 px-3">Sexe</Table.Head>
          <Table.Head class="h-9 py-1 px-3">Type</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each csvPreview as row}
          <Table.Row class="hover:bg-muted/30">
            <Table.Cell class="py-1.5 px-3 font-medium text-xs">{row.licence}</Table.Cell>
            <Table.Cell class="py-1.5 px-3 text-xs text-muted-foreground">{row.season}</Table.Cell>
            <Table.Cell class="py-1.5 px-3 text-xs font-semibold">{row.lastName}</Table.Cell>
            <Table.Cell class="py-1.5 px-3 text-xs">{row.firstName}</Table.Cell>
            <Table.Cell class="py-1.5 px-3 text-xs">{row.gender}</Table.Cell>
            <Table.Cell class="py-1.5 px-3 text-xs text-muted-foreground">{row.type}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</div>
