<script lang="ts">
  import { Search, ChevronLeft, ChevronRight, User, MoreVertical, Eye } from 'lucide-svelte';
  import { Table, Button, Badge } from '@metacult/shared-ui';

  interface Member {
    id: number;
    licence: string;
    lastName: string;
    firstName: string;
    gender: 'M' | 'F';
    birthDate: string;
    status: string;
    type: string;
    paid: boolean;
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
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Adhérent</Table.Head>
            <Table.Head>Licence</Table.Head>
            <Table.Head>Genre</Table.Head>
            <Table.Head>Type</Table.Head>
            <Table.Head>Statut</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data as member}
            <Table.Row class="hover:bg-muted/50 transition-colors">
              <Table.Cell class="font-medium flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User class="w-4 h-4" />
                </div>
                <div>
                  <div class="font-semibold">{member.lastName} {member.firstName}</div>
                  <div class="text-xs text-muted-foreground">Né le {member.birthDate}</div>
                </div>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">{member.licence}</Table.Cell>
              <Table.Cell>{member.gender}</Table.Cell>
              <Table.Cell>
                <Badge variant="secondary">
                  {member.type}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {#if member.status === 'valide'}
                  <Badge variant="outline" class="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Valide
                  </Badge>
                {:else}
                  <Badge variant="outline" class="bg-destructive/15 border-destructive/30 text-destructive font-semibold">
                    Suspendu
                  </Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right relative">
                <div class="inline-block text-left">
                  <Button 
                    variant="ghost"
                    size="icon-sm"
                    onclick={(e) => toggleDropdown(member.licence, e)} 
                    class="text-muted-foreground hover:text-foreground cursor-pointer" 
                    aria-label="Actions"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </Button>

                  {#if openDropdownId === member.licence}
                    <div class="absolute right-4 mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left">
                      <a
                        href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
                        class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer no-underline bg-transparent"
                      >
                        <Eye class="w-3.5 h-3.5" />
                        Voir profil
                      </a>
                      {#if member.paid}
                        <a
                          href={`/admin/compta/attestations/${member.id}`}
                          target="_blank"
                          class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer no-underline bg-transparent"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Attestation CSE
                        </a>
                      {/if}
                    </div>
                  {/if}
                </div>
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={6} class="p-8 text-center text-muted-foreground">
                Aucun adhérent ne correspond à ces critères de recherche.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
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
          <Button
            variant="outline"
            size="icon-sm"
            onclick={() => changePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft class="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onclick={() => changePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>
