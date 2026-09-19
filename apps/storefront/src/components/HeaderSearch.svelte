<script lang="ts">
  import { HeaderSearch, softNavigate } from '@nba/ui';
  import { storefrontNavGroups } from '../lib/nav';
  import type { SessionPayload } from '../lib/auth';
  import SearchResults from './SearchResults.svelte';

  /**
   * La loupe de l'en-tête — la seule, au doigt comme à la souris : le panneau qui
   * descend du haut de l'écran, à deux étages (le menu, puis le contenu du club).
   * Avant la saisie, les entrées de « Mon compte » tiennent lieu de liens rapides.
   * La barre du bas n'en a pas : deux loupes à l'écran, c'est une de trop.
   */
  let {
    features = {},
    session = null
  }: {
    features?: Partial<Record<string, boolean>>;
    session?: Pick<SessionPayload, 'members' | 'activeMemberId'> | null;
  } = $props();

  let query = $state('');
  let firstHref = $state<string | null>(null);
  let panel = $state<{ closeSearch: () => void } | null>(null);
  const groups = $derived(storefrontNavGroups({ features, session }));
  const quickLinks = $derived(groups.find((g) => g.label === 'Mon compte')?.items ?? []);

  function go(href: string) {
    panel?.closeSearch();
    softNavigate(href);
  }
</script>

<HeaderSearch
  bind:this={panel}
  bind:query
  placeholder="Adhérent, article, équipe, produit…"
  onSubmit={() => firstHref && go(firstHref)}
>
  {#if query.trim()}
    <SearchResults {query} {groups} bind:firstHref onPick={go} />
  {:else}
    <p class="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Liens rapides</p>
    <div class="p-1.5">
      {#each quickLinks as link (link.href)}
        <button type="button" class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10" onclick={() => go(link.href)}>
          {link.name}
        </button>
      {/each}
    </div>
  {/if}
</HeaderSearch>
