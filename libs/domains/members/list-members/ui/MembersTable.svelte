<script module>
</script>
<script lang="ts">
  import { Eye, ChevronRight, Receipt } from '@lucide/svelte';
  import { Button, Badge, DropdownMenu, DataTable, Table, DataTableColumnHeader, DataTableRowActions, MemberAvatar, uiConfirm, toast, flashAndReload, softNavigate } from '@nba/ui';
  import type { Member, Pagination, Filters, Season } from './members-table-types';
  import { membershipStatusLabel, membershipStatusVariant } from '../../shared/membership-status';
  import MembersTableFiltersPopover from './MembersTableFiltersPopover.svelte';

  let { data = [], pagination, filters, seasons = [] }: { data: Member[]; pagination: Pagination; filters: Filters; seasons?: Season[] } = $props();

  /**
   * Adresse du portrait, ou `null` : la silhouette prend alors le relais.
   *
   * `size=128` et non 512 : la vignette fait 32 px, et deux cents portraits en pleine
   * résolution feraient de la liste la page la plus lourde de l'administration.
   *
   * La version est convertie en millisecondes plutôt que reprise telle quelle : c'est la
   * forme qu'emploie la fiche, et deux formes pour la même image feraient deux entrées
   * de cache pour un seul portrait.
   */
  function photoSrc(member: Member): string | null {
    const raw = member.photoUpdatedAt;
    if (raw === null || raw === undefined) return null;
    const version = typeof raw === 'number' ? raw : Date.parse(raw);
    if (!Number.isFinite(version)) return null;
    return `/admin/api/member-photo?licence=${encodeURIComponent(member.licence)}&size=128&v=${version}`;
  }

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
        flashAndReload(authorize
          ? `${name} peut désormais soumettre des notes de frais.`
          : `${name} ne peut plus soumettre de notes de frais.`);
        return;
      }
      const txt = await res.text().catch(() => '');
      toast.error(txt || `Échec de la mise à jour (HTTP ${res.status}).`);
    } catch (e: any) {
      toast.error('Erreur réseau : ' + (e?.message ?? String(e)));
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
    softNavigate(`/admin/members?${params.toString()}`);
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
    softNavigate(`/admin/members?${params.toString()}`);
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
            <MemberAvatar
              src={photoSrc(member)}
              name={`${member.lastName} ${member.firstName}`}
              class="shrink-0 group-hover:bg-primary/20"
            />
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
          <Badge variant={membershipStatusVariant(member.status)}>
            {membershipStatusLabel(member.status)}
          </Badge>
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
            <MemberAvatar
              src={photoSrc(member)}
              name={`${member.lastName} ${member.firstName}`}
              class="size-9 shrink-0 transition-colors group-hover:bg-primary/20"
            />
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm truncate group-hover:text-primary transition-colors">
                {member.lastName} {member.firstName}
              </div>
              <div class="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Licence: {member.licence}</span>
                <span
                  class="inline-flex items-center text-[10px] font-semibold {member.status === 'valide'
                    ? 'text-success'
                    : member.status === 'suspendu'
                      ? 'text-destructive'
                      : member.status === 'incomplet'
                        ? 'text-warning'
                        : 'text-muted-foreground'}"
                >
                  • {membershipStatusLabel(member.status)}
                </span>
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
