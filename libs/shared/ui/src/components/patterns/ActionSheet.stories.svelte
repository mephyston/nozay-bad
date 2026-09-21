<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ActionSheet, type SwipeAction } from '@nba/ui';
  import { Edit, Layers, Power, Trash2 } from '@lucide/svelte';

  const ACTIONS: SwipeAction[] = [
    { id: 'modifier', label: 'Modifier', icon: Edit, run: () => {} },
    { id: 'declinaison', label: 'Ajouter une déclinaison', icon: Layers, run: () => {} },
    { id: 'desactiver', label: 'Désactiver', icon: Power, run: () => {} },
    { id: 'supprimer', label: 'Supprimer', icon: Trash2, tone: 'destructive', run: () => {} },
  ];

  const { Story } = defineMeta({
    title: 'Patterns/ActionSheet',
    component: ActionSheet,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="AvecTitre">
  {#snippet template()}
    <!--
      Pleine largeur, rangées de 44 points, destructive en rouge et « Annuler »
      détaché en dessous : la feuille d'actions d'iOS, qui remplace au doigt le
      menu flottant ancré — lequel se pose souvent hors de portée du pouce.
    -->
    <div class="h-screen w-full bg-background">
      <ActionSheet open actions={ACTIONS} item={null} title="Maillot club — Homme" />
    </div>
  {/snippet}
</Story>

<Story name="SansTitre">
  {#snippet template()}
    <div class="h-screen w-full bg-background">
      <ActionSheet open actions={ACTIONS.slice(0, 2)} item={null} />
    </div>
  {/snippet}
</Story>
