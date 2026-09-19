<script lang="ts">
  import { Home, ShoppingCart, Newspaper, CalendarDays, User, IdCard, Wallet, History, FileText, Bell, Receipt, Trophy, Users, Package, Loader2 } from '@lucide/svelte';
  import { searchNav, MenuSearchResults, type NavSearchHit, type SearchableNavGroup } from '@nba/ui';
  import { searchContent, type ContentSearchGroup } from '../lib/search';

  /**
   * Les résultats de la recherche de l'espace adhérent, à deux étages.
   *
   * Le **menu** — onglets et entrées de « Mon compte » — répond à la première lettre,
   * sans réseau. Le **contenu** du club — adhérents, actualités, agenda, équipes,
   * boutique — est demandé à l'API après deux lettres et 250 ms de silence ; une
   * réponse en retard sur une frappe plus récente est jetée. Partagé par la loupe du
   * bas (téléphone) et celle de l'en-tête (souris).
   */
  let {
    query,
    groups,
    firstHref = $bindable(null),
    onPick
  }: {
    query: string;
    groups: SearchableNavGroup[];
    /** Le premier résultat, page ou contenu : ce que rend Entrée. */
    firstHref?: string | null;
    onPick: (href: string) => void;
  } = $props();

  const ICONS: Record<string, any> = { Home, Newspaper, CalendarDays, ShoppingCart, Trophy, Users, User, IdCard, Wallet, History, FileText, Bell, Receipt, Package };
  const KIND_ICONS: Record<string, any> = { member: User, post: Newspaper, event: CalendarDays, team: Trophy, product: Package };

  let content = $state<ContentSearchGroup[]>([]);
  let loading = $state(false);

  const pageHits = $derived<NavSearchHit[]>(searchNav(groups, [], query, 5));
  const contentCount = $derived(content.reduce((n, g) => n + g.hits.length, 0));

  $effect(() => {
    firstHref = pageHits[0]?.href ?? content.find((g) => g.hits.length > 0)?.hits[0]?.href ?? null;
  });

  let ticket = 0;
  $effect(() => {
    const q = query.trim();
    const mine = ++ticket;
    if (q.length < 2) {
      content = [];
      loading = false;
      return;
    }
    loading = true;
    const timer = setTimeout(async () => {
      const result = await searchContent(q);
      if (mine !== ticket) return;
      content = result;
      loading = false;
    }, 250);
    return () => clearTimeout(timer);
  });
</script>

{#if pageHits.length > 0}
  <p class="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</p>
  <MenuSearchResults hits={pageHits} {query} icons={ICONS} onPick={(hit) => onPick(hit.href)} />
{/if}
{#each content as group (group.kind)}
  {#if group.hits.length > 0}
    {@const Icon = KIND_ICONS[group.kind]}
    <p class="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
    <div class="p-1.5">
      {#each group.hits as hit (hit.href)}
        <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/10" onclick={() => onPick(hit.href)}>
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"><Icon class="h-4 w-4" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-foreground">{hit.title}</span>
            {#if hit.subtitle}<span class="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>{/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}
{/each}
{#if pageHits.length === 0 && contentCount === 0}
  <p class="px-4 py-3 text-sm text-muted-foreground">
    {#if loading}
      <Loader2 class="mr-1.5 inline h-4 w-4 animate-spin" /> Recherche…
    {:else if query.trim().length < 2}
      Tapez au moins deux lettres.
    {:else}
      Rien pour « {query.trim()} ».
    {/if}
  </p>
{/if}
