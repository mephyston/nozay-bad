<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { PageHeader, PageTitleSlot, ListSearchField, SegmentedFilter, Button } from '@nba/ui';
  import { Plus } from '@lucide/svelte';

  const { Story } = defineMeta({
    title: 'Patterns/PageHeader',
    component: PageHeader,
    tags: ['autodocs'],
  });
</script>

<Story name="GrandTitre">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <PageHeader title="Adhérents" description="Les licenciés de la saison en cours." />
    </div>
  {/snippet}
</Story>

<Story name="AvecActions">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <PageHeader title="Articles" description="Le catalogue de la boutique.">
        {#snippet actions()}
          <Button class="gap-1.5"><Plus class="size-4" /> Nouveau</Button>
        {/snippet}
      </PageHeader>
    </div>
  {/snippet}
</Story>

<Story name="AvecRechercheEtSegments">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <PageHeader title="Adhérents" description="Les licenciés de la saison en cours.">
        {#snippet search()}
          <div class="space-y-3">
            <ListSearchField placeholder="Rechercher un adhérent" />
            <SegmentedFilter
              value="tous"
              options={[
                { value: 'tous', label: 'Tous', count: 128 },
                { value: 'valide', label: 'Valides', count: 119 },
                { value: 'incomplet', label: 'Incomplets', count: 9 },
              ]}
            />
          </div>
        {/snippet}
      </PageHeader>
    </div>
  {/snippet}
</Story>

<Story name="TitreReplie">
  {#snippet template()}
    <!-- L'état que prend la barre de l'application quand le grand titre a quitté l'écran. -->
    <div class="relative flex h-14 w-[390px] max-w-full items-center justify-between border-b border-border bg-background px-4">
      <span class="text-sm text-muted-foreground">Admin</span>
      <PageTitleSlot title="Adhérents" collapsed class="absolute left-1/2 max-w-[55%] -translate-x-1/2" />
      <span class="size-8 rounded-full bg-muted"></span>
    </div>
  {/snippet}
</Story>
