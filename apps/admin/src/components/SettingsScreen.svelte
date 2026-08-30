<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { SettingsManager } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Les écrans de configuration, en coquille.
   *
   * Un seul îlot pour les trois pages : elles affichent le même composant, avec une vue
   * différente. Ce qui les distingue vraiment est **l'écran de relais** qu'elles lisent,
   * car leurs permissions de lecture diffèrent.
   */
  let {
    domaine,
    ecran,
    titre,
    description,
    view,
    allowedViews
  }: {
    /*
      Le domaine, et non « configuration » : ces trois écrans sont rangés ensemble dans le
      menu, mais le plan comptable et les saisons relèvent de la comptabilité, les
      catégories de produits de la boutique. Ce sont leurs permissions qui le disent.
    */
    domaine: 'accounting' | 'shop';
    ecran: 'config' | 'seasons' | 'categories';
    titre: string;
    description: string;
    view: 'seasons' | 'compta' | 'classes' | 'shop';
    allowedViews: ('seasons' | 'compta' | 'classes' | 'shop')[];
  } = $props();

  let errorMsg = $state<string | null>(null);
</script>

<PageHeader title={titre} {description} />

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <EcranDistant
    {domaine}
    {ecran}
    variante="formulaire"
    onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
  >
    {#snippet pret(d)}
      <SettingsManager
        seasons={d.seasons ?? []}
        categories={d.categories ?? []}
        accountClasses={d.accountClasses ?? []}
        productCategories={d.productCategories ?? []}
        seasonId=""
        {view}
        {allowedViews}
      />
    {/snippet}
  </EcranDistant>
</div>
