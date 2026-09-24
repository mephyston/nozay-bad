<script lang="ts">
  import { BookOpen } from '@lucide/svelte';
  import { ListView, ListRow, dockDePage } from '@nba/ui';
  import { rubriquesFiltrees, compterArticles, type RubriqueDAide } from '../lib/help-search';

  /**
   * Le centre d'aide, avec sa recherche.
   *
   * Les rubriques sont rendues côté serveur — la collection de contenu est lue au build
   * — et cet îlot ne fait que les réduire au terme cherché. C'est ce qui justifie
   * l'hydratation : sans elle, une recherche dans quarante articles demanderait un
   * aller-retour réseau pour un filtrage qui tient en une ligne.
   *
   * La loupe vit dans la barre du bas, comme sur toutes les listes de l'application.
   * Sur ordinateur elle n'existe pas : la grille tient sur un écran, et `Ctrl+F` du
   * navigateur y fait déjà le travail.
   */
  let { rubriques = [] }: { rubriques: RubriqueDAide[] } = $props();

  let terme = $state('');

  const visibles = $derived(rubriquesFiltrees(rubriques, terme));
  const retenus = $derived(compterArticles(visibles));

  $effect(() =>
    dockDePage.declarerRecherche({
      placeholder: "Chercher dans l'aide",
      valeur: terme,
      onSubmit: (v) => (terme = v)
    })
  );

  const lignes = $derived(
    visibles.flatMap((r) =>
      r.articles.map((a) => ({ ...a, rubrique: r.titre, cle: `${r.cle}/${a.id}` }))
    )
  );
</script>

<!--
  Sur téléphone, une liste groupée par rubrique : la grille de cartes empile deux
  colonnes de liens de 13 px, et son en-tête de carte se lit comme un titre de page.
-->
<div class="md:hidden">
  {#if terme}
    <!--
      Le terme appliqué, écrit en clair : la loupe se referme en pilule et ne montre
      plus que son point, donc rien ne rappellerait pourquoi la liste est courte.
    -->
    <p class="px-4 pb-2 text-xs text-muted-foreground">
      {retenus} article{retenus > 1 ? 's' : ''} pour « {terme} »
    </p>
  {/if}

  <ListView
    items={lignes}
    sections={(l) => l.rubrique}
    emptyIcon={BookOpen}
    emptyTitle="Aucun article"
    emptyDescription={terme
      ? `Rien ne correspond à « ${terme} ».`
      : "Aucun article d'aide n'a été trouvé."}
  >
    {#snippet listRow(l)}
      <ListRow href={`/admin/help/${l.id}`} title={l.titre} subtitle={l.description} />
    {/snippet}
  </ListView>
</div>

<div class="hidden md:block">
  {#if rubriques.length === 0}
    <p class="text-muted-foreground">Aucun article d'aide n'a été trouvé.</p>
  {:else}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      {#each rubriques as rubrique (rubrique.cle)}
        <div class="rounded-xl border bg-card text-card-foreground shadow">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="font-semibold leading-none tracking-tight">{rubrique.titre}</h3>
          </div>
          <div class="p-6 pt-0">
            <div class="grid gap-2">
              {#each rubrique.articles as article (article.id)}
                <a
                  href={`/admin/help/${article.id}`}
                  class="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted"
                >
                  <div class="flex-1">
                    <div class="text-sm font-medium">{article.titre}</div>
                    {#if article.description}
                      <div class="text-xs text-muted-foreground">{article.description}</div>
                    {/if}
                  </div>
                </a>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
