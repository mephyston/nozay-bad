<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { pullToRefresh, ListView, ListRow } from '@nba/ui';

  const LIGNES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    titre: `Écriture n° ${1000 + i}`,
    jour: '18/09/2026',
  }));

  const { Story } = defineMeta({
    title: 'Actions/PullToRefresh',
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Liste">
  {#snippet template()}
    <!--
      Banc d'essai du geste : un conteneur défilant, comme celui du layout de
      l'administration. Le geste n'existe qu'au doigt — à la souris, rien ne se
      passe, et c'est voulu.
    -->
    <div
      data-scroll-root
      class="h-[600px] w-[390px] max-w-full overflow-y-auto bg-background"
      use:pullToRefresh={{ onRefresh: () => new Promise((r) => setTimeout(r, 800)) }}
    >
      <ListView items={LIGNES} class="p-3">
        {#snippet listRow(l)}
          <ListRow href="#" title={l.titre} subtitle={l.jour} value="145,00 €" valueTone="success" />
        {/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>
