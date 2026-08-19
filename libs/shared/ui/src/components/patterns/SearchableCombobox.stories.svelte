<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { SearchableCombobox } from '@nba/ui';

  const items = [
    { label: 'Compte Courant', value: 'current' },
    { label: 'Compte Livret', value: 'savings' },
    { label: 'Caisse Physique', value: 'cash' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/SearchableCombobox',
    component: SearchableCombobox,
    tags: ['autodocs'],
  });
</script>

<!-- Le menu s'ouvre au clic ; la story montre l'état fermé (déclencheur). -->
<Story name="Default">
  {#snippet template()}
    <div class="w-[280px] max-w-full">
      <SearchableCombobox {items} value="current" />
    </div>
  {/snippet}
</Story>

<Story name="Placeholder">
  {#snippet template()}
    <div class="w-[280px] max-w-full">
      <SearchableCombobox {items} placeholder="Sélectionner un compte…" />
    </div>
  {/snippet}
</Story>
