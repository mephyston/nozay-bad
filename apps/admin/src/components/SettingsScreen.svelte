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
    allowedViews,
    sansEntete = false
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
    /**
     * Monté dans un tiroir : celui-ci porte déjà le titre et la description.
     *
     * Sans cela, l'écran les répétait sous le titre de la feuille — deux fois la même
     * phrase, et la liste repoussée d'autant.
     */
    sansEntete?: boolean;
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

{#if !sansEntete}
  <!--
    `retour` est en dur, et c'est exact : ces trois pages n'ont qu'un seul parent, le
    hub de configuration, et n'apparaissent nulle part ailleurs dans le menu. Le rond
    à chevron ne se montre que sous 768 px — au-dessus, le fil d'Ariane de la barre du
    haut dit déjà d'où l'on vient.
  -->
  <PageHeader
    title={titre}
    {description}
    retour={{ href: '/admin/settings', libelle: 'Retour à la configuration' }}
  />
{/if}

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class={sansEntete ? '' : 'mt-6'}>
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
        accounts={d.accounts ?? []}
        productCategories={d.productCategories ?? []}
        seasonId=""
        view={vue}
        {allowedViews}
      />
    {/snippet}
  </EcranDistant>
</div>
