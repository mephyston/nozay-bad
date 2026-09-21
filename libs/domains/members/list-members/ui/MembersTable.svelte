<script module>
</script>
<script lang="ts">
  import { Eye, Receipt, FileText, Users } from '@lucide/svelte';
  import {
    Badge,
    DropdownMenu,
    DataTable,
    Table,
    DataTableColumnHeader,
    DataTableRowActions,
    RowActionItems,
    ListView,
    ListRow,
    MemberAvatar,
    uiConfirm,
    flashAndReload,
    softNavigate,
    openDocument,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import type { Member, Pagination, Filters, Season } from './members-table-types';
  import { membershipStatusLabel, membershipStatusVariant } from '../../shared/membership-status';
  import { ligneAdherent } from './members-row-model';
  import MembersTableFiltersPopover from './MembersTableFiltersPopover.svelte';

  let { data = [], pagination, filters, seasons = [], canExport = false }: { data: Member[]; pagination: Pagination; filters: Filters; seasons?: Season[]; canExport?: boolean } = $props();

  /**
   * L'export suit les filtres **appliqués**, pas ceux du panneau : une recherche tapée
   * mais pas encore lancée ne doit pas changer le fichier qu'on télécharge.
   */
  const exportHref = $derived.by(() => {
    if (!canExport) return null;
    const params = new URLSearchParams();
    for (const cle of ['search', 'gender', 'type', 'status', 'cohort'] as const) {
      const valeur = filters?.[cle];
      if (valeur) params.set(cle, valeur);
    }
    params.set('season', filters?.season || '25-26');
    return `/admin/api/members/export?${params.toString()}`;
  });

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
      uiAlert(txt || `Échec de la mise à jour (HTTP ${res.status}).`);
    } catch (e: any) {
      uiAlert('Erreur réseau : ' + (e?.message ?? String(e)));
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
  // svelte-ignore state_referenced_locally
  const initialCohort = filters?.cohort ?? '';

  let searchInput = $state(initialSearch);
  let selectedGender = $state(initialGender);
  let selectedStatus = $state(initialStatus);
  let selectedType = $state(initialType);
  let selectedSeason = $state(initialSeason);
  let selectedCohort = $state(initialCohort);

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedType) params.set('type', selectedType);
    if (selectedSeason) params.set('season', selectedSeason);
    if (selectedCohort) params.set('cohort', selectedCohort);
    params.set('page', '1');
    softNavigate(`/admin/members?${params.toString()}`);
  }

  function resetFilters() {
    searchInput = '';
    selectedGender = '';
    selectedStatus = '';
    selectedType = '';
    selectedCohort = '';
    selectedSeason = '25-26';
    applyFilters();
  }

  /**
   * Ce qu'on peut faire d'un adhérent depuis la liste.
   *
   * « Voir la fiche » n'y figure pas : c'est déjà ce que fait l'appui sur la ligne.
   * L'autorisation de note de frais est la seule action courante, donc la seule
   * révélée par un balayage ; l'attestation, plus rare et conditionnée au
   * règlement, reste au menu.
   */
  function actionsAdherent(member: Member): SwipeAction<Member>[] {
    return [
      {
        id: 'note-de-frais',
        label: member.expenseAuthorized ? 'Retirer note de frais' : 'Autoriser note de frais',
        icon: Receipt,
        tone: 'primary',
        run: (m) => toggleExpense(m)
      }
    ];
  }

  function actionsSecondaires(member: Member): SwipeAction<Member>[] {
    if (!member.paid) return [];
    return [
      {
        id: 'attestation',
        label: 'Attestation CSE',
        icon: FileText,
        run: (m) => openDocument(`/admin/accounting/attestations/${m.id}`)
      }
    ];
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
    mobileSpacing="list"
    {pagination}
    onPageChange={changePage}
    itemName="adhérent(s)"
    emptyTitle="Aucun adhérent"
    emptyDescription="Aucun adhérent ne correspond à ces critères de recherche."
  >
    {#snippet toolbar()}
      <MembersTableFiltersPopover
        total={pagination?.total ?? 0}
        bind:searchInput
        bind:selectedSeason
        bind:selectedGender
        bind:selectedType
        bind:selectedStatus
        bind:selectedCohort
        {seasons}
        {exportHref}
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
              <RowActionItems
                actions={[...actionsAdherent(member), ...actionsSecondaires(member)]}
                item={member}
              />
            </DataTableRowActions>
          </div>
        </Table.Cell>
      </Table.Row>
    {/snippet}

    {#snippet mobileView()}
      <ListView
        items={data}
        emptyIcon={Users}
        emptyTitle="Aucun adhérent"
        emptyDescription="Aucun adhérent ne correspond à ces critères."
      >
        {#snippet listRow(member)}
          {@const l = ligneAdherent(member, filters?.season || '25-26')}
          <ListRow
            item={member}
            href={l.href}
            title={l.titre}
            subtitle={l.sousTitre}
            value={l.valeur}
            valueTone={l.ton}
            swipe={actionsAdherent(member)}
            actions={actionsSecondaires(member)}
          >
            {#snippet leading()}
              <MemberAvatar src={photoSrc(member)} name={l.titre} class="size-9 shrink-0" />
            {/snippet}
          </ListRow>
        {/snippet}
      </ListView>
    {/snippet}
  </DataTable>
</div>
