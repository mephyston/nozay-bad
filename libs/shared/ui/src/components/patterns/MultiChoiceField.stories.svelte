<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { MultiChoiceField, FormField } from '@nba/ui';

  const RUBRIQUES = [
    { value: '1', label: 'Actions jeunes' },
    { value: '2', label: 'Animation' },
    { value: '3', label: 'Tournoi' },
    { value: '4', label: 'Interclub' },
    { value: '5', label: 'Informations générales' },
    { value: '6', label: 'Divers' },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/MultiChoiceField',
    component: MultiChoiceField,
    tags: ['autodocs'],
  });
</script>

<!--
  Au doigt, une rangée qui résume et mène à l'écran de choix ; à la souris, la grille
  de cases. Les deux rendus vivent dans le même composant : c'est la largeur qui
  tranche, et non un `{#if}` de l'appelant.
-->
<Story name="Vide">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <FormField id="cat-vide" label="Catégories">
        <MultiChoiceField id="cat-vide" label="Catégories" values={[]} options={RUBRIQUES} />
      </FormField>
    </div>
  {/snippet}
</Story>

<Story name="AvecChoix">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <FormField id="cat-choix" label="Catégories">
        <MultiChoiceField
          id="cat-choix"
          label="Catégories"
          values={['3', '6']}
          options={RUBRIQUES}
        />
      </FormField>
    </div>
  {/snippet}
</Story>

<!-- Plusieurs retenus : le résumé tronque plutôt que de pousser le chevron dehors. -->
<Story name="ResumeLong">
  {#snippet template()}
    <div class="w-[390px] max-w-full">
      <FormField id="cat-long" label="Catégories">
        <MultiChoiceField
          id="cat-long"
          label="Catégories"
          values={['1', '2', '3', '5']}
          options={RUBRIQUES}
        />
      </FormField>
    </div>
  {/snippet}
</Story>
