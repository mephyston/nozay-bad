<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { DataTable, ListView, ListRow, Table } from '@nba/ui';

  type Article = { id: number; nom: string; categorie: string; prix: string; variante?: boolean };

  const ARTICLES: Article[] = [
    { id: 1, nom: 'Maillot club — Homme', categorie: 'Textile', prix: 'selon déclinaison' },
    { id: 2, nom: 'Taille M', categorie: 'Textile', prix: '32,00 €', variante: true },
    { id: 3, nom: 'Taille L', categorie: 'Textile', prix: '32,00 €', variante: true },
    { id: 4, nom: 'Volants plumes (tube)', categorie: 'Volants', prix: '24,50 €' },
    { id: 5, nom: 'Cordage BG80', categorie: 'Cordage', prix: '18,00 €' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/DataTable',
    component: DataTable,
    tags: ['autodocs'],
  });
</script>

<Story name="VueListeMobile">
  {#snippet template()}
    <!--
      L'intégration table ↔ liste, figée : sous `md`, `DataTable` doit s'effacer
      complètement — y compris la bague et le rembourrage de sa carte, qui
      doublaient le cadre de la liste.
    -->
    <div class="w-[390px] max-w-full">
      <DataTable data={ARTICLES} mobileSpacing="list">
        {#snippet header()}
          <Table.Head>Article</Table.Head>
          <Table.Head>Prix</Table.Head>
        {/snippet}
        {#snippet row(a)}
          <Table.Row>
            <Table.Cell>{a.nom}</Table.Cell>
            <Table.Cell>{a.prix}</Table.Cell>
          </Table.Row>
        {/snippet}
        {#snippet mobileView()}
          <ListView items={ARTICLES}>
            {#snippet listRow(a)}
              <ListRow
                href="#"
                title={a.nom}
                subtitle={a.variante ? undefined : a.categorie}
                value={a.prix}
                valueTone={a.prix.startsWith('selon') ? 'muted' : 'foreground'}
                class={a.variante ? 'pl-4' : ''}
              />
            {/snippet}
          </ListView>
        {/snippet}
      </DataTable>
    </div>
  {/snippet}
</Story>
