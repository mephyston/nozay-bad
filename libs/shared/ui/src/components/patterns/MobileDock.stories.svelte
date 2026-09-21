<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { MobileDock, dockDePage, Button } from '@nba/ui';
  import MobileDockHarness from './MobileDockHarness.svelte';
  import { Upload, Download, Plus } from '@lucide/svelte';

  const RECHERCHE = {
    placeholder: 'Rechercher un adhérent',
    valeur: '',
    onSubmit: () => {},
    filtres: { actif: false, ouvrir: () => {} },
  };

  const IMPORT = { id: 'import', libelle: 'Import Poona', icone: Upload, run: () => {} };
  const EXPORT = { id: 'export', libelle: 'Exporter les mails', icone: Download, run: () => {} };
  const NOUVEAU = { id: 'nouveau', libelle: 'Nouveau produit', icone: Plus, run: () => {} };

  const { Story } = defineMeta({
    title: 'Patterns/MobileDock',
    component: MobileDock,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="DeuxActions">
  {#snippet template()}
    <!--
      L'écran déclare avant que la barre ne se monte : c'est l'ordre courant, la
      barre appartenant à un îlot hydraté plus tard que celui de l'écran.
    -->
    <MobileDockHarness actions={[IMPORT, EXPORT]} />
  {/snippet}
</Story>

<Story name="UneAction">
  {#snippet template()}
    <MobileDockHarness actions={[NOUVEAU]} />
  {/snippet}
</Story>

<Story name="DeclarationApresMontage">
  {#snippet template()}
    <!--
      L'ordre inverse : la barre est déjà là quand l'écran déclare. C'est l'événement
      de fenêtre qui doit alors la prévenir — le cas qu'aucun test ne couvrait, et
      par lequel les actions n'arrivaient jamais.
    -->
    <div class="h-screen w-full bg-background p-4">
      <Button data-test="declarer" onclick={() => dockDePage.declarerActions([IMPORT, EXPORT])}>
        Déclarer les actions
      </Button>
      <MobileDock onMenuClick={() => {}} />
    </div>
  {/snippet}
</Story>
