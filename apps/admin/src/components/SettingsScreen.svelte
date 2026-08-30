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
    /** Vue ouverte à défaut ; `?view=` de l'URL la remplace si elle est permise. */
    view: 'seasons' | 'compta' | 'classes' | 'shop';
    allowedViews: ('seasons' | 'compta' | 'classes' | 'shop')[];
  } = $props();

  /*
    L'onglet ouvert vient de l'URL, lue dans le navigateur : une page figée n'a pas de
    chaîne de requête à passer. Contrôlé contre `allowedViews` — sans quoi `?view=seasons`
    sur l'écran de la boutique ouvrirait un onglet que la page ne sert pas.
  */
  const vue = $derived.by(() => {
    if (typeof window === 'undefined') return view;
    const demandee = new URLSearchParams(window.location.search).get('view');
    return demandee && (allowedViews as string[]).includes(demandee) ? (demandee as typeof view) : view;
  });

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
        view={vue}
        {allowedViews}
      />
    {/snippet}
  </EcranDistant>
</div>
