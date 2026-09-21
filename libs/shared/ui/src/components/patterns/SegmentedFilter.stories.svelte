<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { SegmentedFilter } from '@nba/ui';

  const { Story } = defineMeta({
    title: 'Patterns/SegmentedFilter',
    component: SegmentedFilter,
    tags: ['autodocs'],
  });
</script>

<Story name="DeuxSegments">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <SegmentedFilter value="ouvertes" options={[{ value: 'ouvertes', label: 'Ouvertes' }, { value: 'closes', label: 'Closes' }]} />
    </div>
  {/snippet}
</Story>

<Story name="QuatreSegmentsAvecCompteurs">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <SegmentedFilter
        value="tous"
        options={[
          { value: 'tous', label: 'Tous', count: 128 },
          { value: 'valide', label: 'Valides', count: 119 },
          { value: 'incomplet', label: 'Incomplets', count: 9 },
          { value: 'suspendu', label: 'Suspendus', count: 0 },
        ]}
      />
    </div>
  {/snippet}
</Story>

<Story name="DebordementHorizontal">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <SegmentedFilter
        value="tous"
        options={[
          { value: 'tous', label: 'Tous' },
          { value: 'cotisations', label: 'Cotisations' },
          { value: 'depenses', label: 'Dépenses' },
          { value: 'subventions', label: 'Subventions' },
          { value: 'virements', label: 'Virements internes' },
        ]}
      />
    </div>
  {/snippet}
</Story>
