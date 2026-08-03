<script module>
  export * from './members-table-types';
</script>
<script lang="ts">
  import { User, Eye, ChevronRight, Receipt } from '@lucide/svelte';
  import { Button, Badge, DropdownMenu, DataTable, Table, DataTableColumnHeader, DataTableRowActions, uiConfirm } from '@nba/ui';
  import type { Member, Pagination, Filters, Season } from './members-table-types';
  import MembersTableFiltersPopover from './MembersTableFiltersPopover.svelte';

  let { data = [], pagination, filters, seasons = [] }: { data: Member[]; pagination: Pagination; filters: Filters; seasons?: Season[] } = $props();

  // Bascule l'autorisation de note de frais d'un adhérent (raccourci depuis la liste).
  let togglingId = $state<number | null>(null);
  async function toggleExpense(member: Member) {
    if (togglingId !== null) return;
    const authorize = !member.expenseAuthorized;
    const name = `${member.firstName} ${member.lastName}`;
    const ok = await uiConfirm(
      authorize
        ? `Autoriser ${name} à soumettre des notes de frais ?`
        : `Retirer à ${name} l'autorisation de soumettre des notes de frais ?`
    );
    if (!ok) return;
    togglingId = member.id;
    try {
      const res = await fetch('/admin/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, authorized: !member.expenseAuthorized })
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const txt = await res.text().catch(() => '');
      alert(`Échec de la mise à jour (HTTP ${res.status}). ${txt}`);
    } catch (e: any) {
      alert('Erreur réseau : ' + (e?.message ?? String(e)));
    }
    togglingId = null;
  }

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
  <DataTable
    {data}
    {pagination}
    onPageChange={changePage}
    itemName="adhérent(s)"
    emptyTitle="Aucun adhérent"
    emptyDescription="Aucun adhérent ne correspond à ces critères de recherche."
  >
    {#snippet toolbar()}
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
    {/snippet}

    {#snippet header()}
      <DataTableColumnHeader title="Adhérent" />
      <DataTableColumnHeader title="Licence" />
      <DataTableColumnHeader title="Genre" />
      <DataTableColumnHeader title="Type" />
      <DataTableColumnHeader title="Statut" />
      <DataTableColumnHeader title="Actions" class="text-right" />
    {/snippet}

    {#snippet row(member)}
      <Table.Row>
        <Table.Cell class="font-medium">
          <a
            href={`/admin/members/${member.licence}?season=${filters?.season || '25-26'}`}
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
            <Badge variant="success">
              Valide
            </Badge>
          {:else}
            <Badge variant="destructive">
              Suspendu
            </Badge>
          {/if}
        </Table.Cell>
        <Table.Cell class="text-right relative">
          <div class="flex items-center justify-end gap-1">
            <DataTableRowActions>
              <DropdownMenu.Item asChild>
                <a
                  href={`/admin/members/${member.licence}?season=${filters?.season || '25-26'}`}
                  class="cursor-pointer flex items-center w-full"
                >
                  <Eye class="w-3.5 h-3.5 mr-2" />
                  Voir profil
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => toggleExpense(member)} class="cursor-pointer flex items-center w-full">
                <Receipt class="w-3.5 h-3.5 mr-2" />
                {member.expenseAuthorized ? 'Retirer note de frais' : 'Autoriser note de frais'}
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
            </DataTableRowActions>
          </div>
        </Table.Cell>
      </Table.Row>
    {/snippet}

    {#snippet mobileView()}
      {#each data as member}
        <div class="flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors">
          <a
            href={`/admin/members/${member.licence}?season=${filters?.season || '25-26'}`}
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
                  <span class="inline-flex items-center text-[10px] font-semibold text-success">
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
            <DataTableRowActions>
              <DropdownMenu.Item asChild>
                <a
                  href={`/admin/members/${member.licence}?season=${filters?.season || '25-26'}`}
                  class="cursor-pointer flex items-center w-full"
                >
                  <Eye class="w-4 h-4 text-primary mr-2" />
                  Voir la fiche
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => toggleExpense(member)} class="cursor-pointer flex items-center w-full">
                <Receipt class="w-3.5 h-3.5 mr-2" />
                {member.expenseAuthorized ? 'Retirer note de frais' : 'Autoriser note de frais'}
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
            </DataTableRowActions>

            <a
              href={`/admin/members/${member.licence}?season=${filters?.season || '25-26'}`}
              class="p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Voir la fiche"
            >
              <ChevronRight class="w-4 h-4" />
            </a>
          </div>
        </div>
      {/each}
    {/snippet}
  </DataTable>
</div>
