<script lang="ts">
  import { Search, ChevronLeft, ChevronRight, User, MoreVertical, Eye } from 'lucide-svelte';

  interface Member {
    licence: string;
    lastName: string;
    firstName: string;
    gender: 'M' | 'F';
    birthDate: string;
    status: string;
    type: string;
  }

  interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  interface Filters {
    search: string;
    gender: string;
    status: string;
    type: string;
    season?: string;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
  }

  let { data = [], pagination, filters, seasons = [] }: { data: Member[]; pagination: Pagination; filters: Filters; seasons?: Season[] } = $props();

  // svelte-ignore state_referenced_locally
  const initialSearch = filters?.search ?? '';
  // svelte-ignore state_referenced_locally
  const initialGender = filters?.gender ?? '';
  // svelte-ignore state_referenced_locally
  const initialStatus = filters?.status ?? '';
  // svelte-ignore state_referenced_locally
  const initialType = filters?.type ?? '';
  // svelte-ignore state_referenced_locally
  const initialSeason = filters?.season ?? '25-26';

  let searchInput = $state(initialSearch);
  let selectedGender = $state(initialGender);
  let selectedStatus = $state(initialStatus);
  let selectedType = $state(initialType);
  let selectedSeason = $state(initialSeason);
  let openDropdownId = $state<string | null>(null);

  function toggleDropdown(id: string, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedType) params.set('type', selectedType);
    if (selectedSeason) params.set('season', selectedSeason);
    params.set('page', '1'); // reset page on filter change
    window.location.href = `/admin/members?${params.toString()}`;
  }

  function changePage(newPage: number) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    window.location.href = `/admin/members?${params.toString()}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  }
</script>

<div class="space-y-4">
  <!-- Filters Block -->
  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
    <div class="relative">
      <span class="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
        <Search class="w-4 h-4" />
      </span>
      <input
        type="text"
        placeholder="Rechercher (Nom, Licence...)"
        class="w-full pl-9 pr-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={searchInput}
        onkeydown={handleKeydown}
      />
    </div>

    <div>
      <select
        class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        bind:value={selectedSeason}
        onchange={applyFilters}
      >
        {#each seasons as season}
          <option value={season.id}>{season.name}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
    </div>

    <div>
      <select
        class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={selectedGender}
        onchange={applyFilters}
      >
        <option value="">Tous les genres</option>
        <option value="M">Homme (M)</option>
        <option value="F">Femme (F)</option>
      </select>
    </div>

    <div>
      <select
        class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={selectedType}
        onchange={applyFilters}
      >
        <option value="">Tous les types</option>
        <option value="Competiteur">Compétiteur</option>
        <option value="Loisir">Loisir</option>
      </select>
    </div>

    <div>
      <select
        class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={selectedStatus}
        onchange={applyFilters}
      >
        <option value="">Tous les statuts</option>
        <option value="valide">Valide</option>
        <option value="suspendu">Suspendu</option>
      </select>
    </div>
  </div>

  <!-- Table -->
  <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="overflow-x-auto min-h-[150px]">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
          <tr>
            <th class="p-4">Adhérent</th>
            <th class="p-4">Licence</th>
            <th class="p-4">Genre</th>
            <th class="p-4">Type</th>
            <th class="p-4">Statut</th>
            <th class="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each data as member}
            <tr class="hover:bg-muted/50 transition-colors">
              <td class="p-4 font-medium flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User class="w-4 h-4" />
                </div>
                <div>
                  <div class="font-semibold">{member.lastName} {member.firstName}</div>
                  <div class="text-xs text-muted-foreground">Né le {member.birthDate}</div>
                </div>
              </td>
              <td class="p-4 text-muted-foreground">{member.licence}</td>
              <td class="p-4">{member.gender}</td>
              <td class="p-4">
                <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary/50 border border-secondary text-foreground">
                  {member.type}
                </span>
              </td>
              <td class="p-4">
                {#if member.status === 'valide'}
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Valide
                  </span>
                {:else}
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 border border-destructive/30 text-destructive">
                    Suspendu
                  </span>
                {/if}
              </td>
              <td class="p-4 text-right relative">
                <div class="inline-block text-left">
                  <button 
                    onclick={(e) => toggleDropdown(member.licence, e)} 
                    class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                    aria-label="Actions"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </button>

                  {#if openDropdownId === member.licence}
                    <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left">
                      <a
                        href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
                        class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer no-underline bg-transparent"
                      >
                        <Eye class="w-3.5 h-3.5" />
                        Voir profil
                      </a>
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="p-8 text-center text-muted-foreground">
                Aucun adhérent ne correspond à ces critères de recherche.
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div class="p-4 border-t border-border flex items-center justify-between">
      <div class="text-xs text-muted-foreground">
        Total : {pagination.total} adhérent(s)
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs">
          Page {pagination.page} sur {pagination.totalPages}
        </span>
        <div class="flex gap-1">
          <button
            class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={() => changePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={() => changePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
