<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ListView, ListRow } from '@nba/ui';
  import { Receipt } from '@lucide/svelte';

  type Ecriture = { id: number; libelle: string; jour: string; montant: string; sens: 'success' | 'destructive' };

  const ECRITURES: Ecriture[] = [
    { id: 1, libelle: 'Cotisation — Dupont Marie', jour: '18/09/2026', montant: '145,00 €', sens: 'success' },
    { id: 2, libelle: 'Cotisation — Martin Jean', jour: '18/09/2026', montant: '145,00 €', sens: 'success' },
    { id: 3, libelle: 'Achat volants', jour: '17/09/2026', montant: '-312,40 €', sens: 'destructive' },
    { id: 4, libelle: 'Location gymnase', jour: '15/09/2026', montant: '-880,00 €', sens: 'destructive' },
    { id: 5, libelle: 'Subvention mairie', jour: '15/09/2026', montant: '1 200,00 €', sens: 'success' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/ListView',
    component: ListView,
    tags: ['autodocs'],
  });
</script>

<Story name="Plate">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <ListView items={ECRITURES}>
        {#snippet listRow(e)}
          <ListRow href="#" title={e.libelle} subtitle={e.jour} value={e.montant} valueTone={e.sens} />
        {/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>

<Story name="SectionsGroupees">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <ListView items={ECRITURES} sections={(e) => e.jour}>
        {#snippet listRow(e)}
          <ListRow href="#" title={e.libelle} value={e.montant} valueTone={e.sens} />
        {/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>

<Story name="SectionsCollantes">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <ListView items={ECRITURES} sections={(e) => e.jour} inset="plain">
        {#snippet listRow(e)}
          <ListRow href="#" title={e.libelle} value={e.montant} valueTone={e.sens} />
        {/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>

<Story name="Chargement">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <ListView items={[] as Ecriture[]} isLoading skeletonRows={4} skeletonLeading>
        {#snippet listRow()}{/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>

<Story name="Vide">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <ListView
        items={[] as Ecriture[]}
        emptyIcon={Receipt}
        emptyTitle="Aucune écriture"
        emptyDescription="Rien n'a encore été saisi sur cet exercice."
      >
        {#snippet listRow()}{/snippet}
      </ListView>
    </div>
  {/snippet}
</Story>
