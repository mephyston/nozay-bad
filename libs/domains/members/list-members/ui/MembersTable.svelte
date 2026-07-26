<script module>
  export * from './members-table-types';
</script>
<script lang="ts">
  import { User, MoreHorizontal, Eye, ChevronRight } from '@lucide/svelte';
  import { Table, Button, Badge, Card, DropdownMenu } from '@nba/ui';
  import type { Member, Pagination, Filters, Season } from './members-table-types';
  import MembersTableFiltersPopover from './MembersTableFiltersPopover.svelte';

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

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedType) params.set('type', selectedType);
    if (selectedSeason) params.set('season', selectedSeason);
    params.set('page', '1');
    window.location.href = `/admin/members?${params.toString()}`;
  }

  function resetFilters() {
    searchInput = '';
    selectedGender = '';
    selectedStatus = '';
    selectedType = '';
    selectedSeason = '25-26';
    applyFilters();
  }

  function changePage(newPage: number) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    window.location.href = `/admin/members?${params.toString()}`;
  }
</script>

<div class="space-y-4">
  <MembersTableFiltersPopover
    bind:searchInput
    bind:selectedSeason
    bind:selectedGender
    bind:selectedType
    bind:selectedStatus
    {seasons}
    onApply={applyFilters}
    onReset={resetFilters}
  />

  <Card.Root class="overflow-hidden shadow-sm">
    <!-- Vue Compacte Cliquable pour Mobile -->
    <Card.Content class="p-0 block sm:hidden divide-y divide-border">
      {#each data as member}
        <div class="flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors">
          <a
            href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
            class="flex items-center gap-3 min-w-0 flex-1 no-underline text-foreground group"
          >
            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <User class="w-4 h-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm truncate group-hover:text-primary transition-colors">
                {member.lastName} {member.firstName}
              </div>
              <div class="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Licence: {member.licence}</span>
                {#if member.status === 'valide'}
                  <span class="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    • Valide
                  </span>
                {:else}
                  <span class="inline-flex items-center text-[10px] font-semibold text-destructive">
                    • Suspendu
                  </span>
                {/if}
              </div>
            </div>
          </a>

          <div class="flex items-center gap-1 shrink-0 ml-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                {#snippet child({ props })}
                  <Button 
                    {...props}
                    aria-haspopup="true"
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal class="w-4 h-4" />
                    <span class="sr-only">Toggle menu</span>
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="w-44" align="end">
                  <DropdownMenu.Label>Actions</DropdownMenu.Label>
                  <DropdownMenu.Item asChild>
                    <a
                      href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
                      class="cursor-pointer flex items-center w-full"
                    >
                      <Eye class="w-4 h-4 text-primary mr-2" />
                      Voir la fiche
                    </a>
                  </DropdownMenu.Item>
                  {#if member.paid}
                    <DropdownMenu.Item asChild>
                      <a
                        href={`/admin/accounting/attestations/${member.id}`}
                        target="_blank"
                        onclick={(e) => {
                          e.preventDefault();
                          window.open(`/admin/accounting/attestations/${member.id}`, '_blank');
                        }}
                        class="cursor-pointer flex items-center w-full"
                      >
                        <svg class="w-4 h-4 text-muted-foreground mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Attestation CSE
                      </a>
                    </DropdownMenu.Item>
                  {/if}
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <a
              href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
              class="p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Voir la fiche"
            >
              <ChevronRight class="w-4 h-4" />
            </a>
          </div>
        </div>
      {:else}
        <div class="p-8 text-center text-muted-foreground text-sm">
          Aucun adhérent ne correspond à ces critères de recherche.
        </div>
      {/each}
    </Card.Content>

    <!-- Vue Tableau pour Tablette / Desktop -->
    <Card.Content class="p-0 hidden sm:block overflow-x-auto min-h-[150px]">
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
            <Table.Row>
              <Table.Cell class="font-medium">
                <a
                  href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
                  class="flex items-center gap-3 no-underline text-foreground hover:text-primary transition-colors group"
                >
                  <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                    <User class="w-4 h-4" />
                  </div>
                  <div>
                    <div class="font-semibold">{member.lastName} {member.firstName}</div>
                    <div class="text-xs text-muted-foreground">Né le {member.birthDate}</div>
                  </div>
                </a>
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
              <Table.Cell class="text-right">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    {#snippet child({ props })}
                      <Button 
                        {...props}
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                        <span class="sr-only">Toggle menu</span>
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content class="w-44" align="end">
                      <DropdownMenu.Label>Actions</DropdownMenu.Label>
                      <DropdownMenu.Item asChild>
                        <a
                          href={`/admin/members/${member.licence}?season=${filters.season || '25-26'}`}
                          class="cursor-pointer flex items-center w-full"
                        >
                          <Eye class="w-3.5 h-3.5 mr-2" />
                          Voir profil
                        </a>
                      </DropdownMenu.Item>
                      {#if member.paid}
                        <DropdownMenu.Item asChild>
                          <a
                            href={`/admin/accounting/attestations/${member.id}`}
                            target="_blank"
                            onclick={(e) => {
                              e.preventDefault();
                              window.open(`/admin/accounting/attestations/${member.id}`, '_blank');
                            }}
                            class="cursor-pointer flex items-center w-full"
                          >
                            <svg class="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Attestation CSE
                          </a>
                        </DropdownMenu.Item>
                      {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
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
    </Card.Content>

    <Card.Footer class="p-4 border-t border-border">
      <Table.Pagination {pagination} onChangePage={changePage} itemName="adhérent(s)" />
    </Card.Footer>
  </Card.Root>
</div>
