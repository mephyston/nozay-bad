<script lang="ts">
  import { HeaderSearch } from '@nba/ui';
  import { fetchSiteSearch, type SiteSearchGroup } from '../lib/search';

  /**
   * La loupe de l'en-tête du site : le panneau qui descend du haut, comme sur apple.com.
   *
   * Avant la saisie, les entrées du menu tiennent lieu de liens rapides ; ensuite, les
   * résultats arrivent après deux lettres et 250 ms de silence — pages, actualités,
   * agenda, rien d'autre : c'est l'API qui borne le site public au public. Entrée sans
   * résultat choisi ouvre la page `/recherche/`, la même recherche sans script.
   */
  let {
    quickLinks = [],
    placeholder = 'Rechercher sur le site'
  }: {
    quickLinks?: { label: string; href: string }[];
    /** « Rechercher sur nozaybad.fr » : le nom d'hôte vient de la configuration, jamais du code. */
    placeholder?: string;
  } = $props();

  let query = $state('');
  let groups = $state<SiteSearchGroup[]>([]);
  let loading = $state(false);
  let panel = $state<{ closeSearch: () => void } | null>(null);

  const total = $derived(groups.reduce((n, g) => n + g.hits.length, 0));
  const first = $derived(groups.find((g) => g.hits.length > 0)?.hits[0] ?? null);

  let ticket = 0;
  $effect(() => {
    const q = query.trim();
    const mine = ++ticket;
    if (q.length < 2) {
      groups = [];
      loading = false;
      return;
    }
    loading = true;
    const timer = setTimeout(async () => {
      const result = await fetchSiteSearch(q);
      if (mine !== ticket) return;
      groups = result;
      loading = false;
    }, 250);
    return () => clearTimeout(timer);
  });

  function go(href: string) {
    panel?.closeSearch();
    window.location.assign(href);
  }

  function submit() {
    const q = query.trim();
    if (first) go(first.href);
    else if (q.length >= 2) go(`/recherche/?q=${encodeURIComponent(q)}`);
  }
</script>

<HeaderSearch bind:this={panel} bind:query {placeholder} label="Rechercher sur le site" onSubmit={submit}>
  {#if query.trim().length >= 2}
    {#each groups as group (group.kind)}
      {#if group.hits.length > 0}
        <p class="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
        <div class="p-1">
          {#each group.hits as hit (hit.href)}
            <button type="button" class="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted" onclick={() => go(hit.href)}>
              <span class="text-sm font-medium text-foreground">{hit.title}</span>
              {#if hit.subtitle}<span class="text-xs text-muted-foreground">{hit.subtitle}</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    {/each}
    {#if total === 0}
      <p class="px-3 py-3 text-sm text-muted-foreground">{loading ? 'Recherche…' : `Rien pour « ${query.trim()} ».`}</p>
    {/if}
  {:else}
    {#if quickLinks.length > 0}
      <p class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Liens rapides</p>
      <div class="p-1">
        {#each quickLinks as link (link.href)}
          <a href={link.href} class="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">{link.label}</a>
        {/each}
      </div>
    {/if}
  {/if}
</HeaderSearch>
