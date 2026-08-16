<script lang="ts">
  import {
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    Table,
    Badge,
    Button,
    uiConfirm,
    toast,
    softNavigate
  } from '@nba/ui';
  import { Trophy, Plus, CalendarDays } from '@lucide/svelte';
  import TeamFormSheet from '../../save-team/ui/TeamFormSheet.svelte';
  import TeamRosterSheet from '../../get-team/ui/TeamRosterSheet.svelte';
  import ChampionshipDaysSheet from '../../save-championship-days/ui/ChampionshipDaysSheet.svelte';
  import type { TeamListItem } from '../dto';
  import type { GetTeamOutput } from '../../get-team/dto';
  import type { ChampionshipDayItem } from '../../list-championship-days/dto';
  import type { Championship } from '../../shared/championship';

  let {
    teams,
    members,
    days,
    daysChampionship,
    seasonCode,
    canWrite = false,
    canDelete = false
  }: {
    teams: TeamListItem[];
    members: Array<{ licence: string; firstName: string; lastName: string }>;
    days: ChampionshipDayItem[];
    daysChampionship: Championship;
    seasonCode: string;
    canWrite?: boolean;
    canDelete?: boolean;
  } = $props();

  let search = $state('');
  let formOpen = $state(false);
  let editing = $state<TeamListItem | null>(null);
  let rosterOpen = $state(false);
  let detail = $state<GetTeamOutput | null>(null);
  let daysOpen = $state(false);

  const filtered = $derived(
    search.trim() === ''
      ? teams
      : teams.filter((team) => {
          const needle = search.trim().toLowerCase();
          return (
            team.name.toLowerCase().includes(needle) ||
            team.championshipLabel.toLowerCase().includes(needle) ||
            team.divisionLabel.toLowerCase().includes(needle)
          );
        })
  );

  /**
   * Rechargement plutôt qu'une mise à jour locale : le staff, l'effectif et le calendrier
   * se recoupent, et recomposer tout cela côté navigateur dupliquerait la logique du
   * serveur — pour finir par en diverger.
   */
  function reload(params: Record<string, string> = {}) {
    const query = new URLSearchParams({ season: seasonCode, championship: daysChampionship, ...params });
    softNavigate(`/admin/teams?${query}`);
  }

  function openCreate() {
    editing = null;
    formOpen = true;
  }

  function openEdit(team: TeamListItem) {
    editing = team;
    formOpen = true;
  }

  async function openRoster(team: TeamListItem) {
    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-team', teamId: team.id })
      });
      const payload = (await response.json()) as { data?: GetTeamOutput; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible.');

      detail = payload.data ?? null;
      rosterOpen = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible.');
    }
  }

  async function remove(team: TeamListItem) {
    const confirmed = await uiConfirm({
      title: `Supprimer ${team.name} ?`,
      description:
        'Son staff, son effectif, ses rencontres et les compositions déjà saisies seront supprimés.',
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;

    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-team', teamId: team.id })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'La suppression a échoué.');
      }
      toast.success(`${team.name} supprimée.`);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }

  function staffLabel(person: TeamListItem['captain']): string {
    if (!person) return '—';
    return `${person.lastName} ${person.firstName}`.trim();
  }
</script>

<DataTable
  data={filtered}
  itemName="équipe"
  emptyIcon={Trophy}
  emptyTitle="Aucune équipe engagée"
  emptyDescription="Créez les équipes du club pour cette saison."
>
  {#snippet toolbar()}
    <DataTableToolbar bind:searchValue={search} searchPlaceholder="Équipe, championnat…" hasSearch>
      {#snippet actions()}
        <Button variant="outline" onclick={() => (daysOpen = true)}>
          <CalendarDays class="w-4 h-4" /> Journées
        </Button>
        {#if canWrite}
          <Button onclick={openCreate}>
            <Plus class="w-4 h-4" /> Créer une équipe
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet header()}
    <Table.Head>Équipe</Table.Head>
    <Table.Head>Championnat</Table.Head>
    <Table.Head>Division</Table.Head>
    <Table.Head>Poule</Table.Head>
    <Table.Head>Capitaine</Table.Head>
    <Table.Head>Vice-capitaine</Table.Head>
    <Table.Head class="text-center">Effectif</Table.Head>
    <Table.Head></Table.Head>
  {/snippet}

  {#snippet row(team: TeamListItem)}
    <!--
      `DataTable` rend ce snippet tel quel dans le corps du tableau : c'est à l'appelant
      de fournir la ligne. Sans ce `<Table.Row>`, toutes les cellules de toutes les
      équipes s'enfilent sur une seule ligne.
    -->
    <Table.Row>
      <Table.Cell class="font-medium">
        {team.name}
        {#if !team.active}
          <Badge variant="outline" class="ml-1">Inactive</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-sm">{team.championshipLabel}</Table.Cell>
      <Table.Cell class="text-sm">
        {team.divisionLabel}
        <span class="text-muted-foreground text-xs">· {team.matchCount} matchs</span>
      </Table.Cell>
      <Table.Cell class="text-sm text-muted-foreground">{team.poolLabel ?? '—'}</Table.Cell>
      <Table.Cell class="text-sm">
        {#if team.captain}
          {staffLabel(team.captain)}
        {:else}
          <Badge variant="warning">Non désigné</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-sm text-muted-foreground">{staffLabel(team.viceCaptain)}</Table.Cell>
      <Table.Cell class="text-center">{team.rosterCount}</Table.Cell>
      <Table.Cell>
        <DataTableRowActions>
          <DropdownMenu.Item onclick={() => openRoster(team)}>Staff et effectif</DropdownMenu.Item>
          {#if canWrite}
            <DropdownMenu.Item onclick={() => openEdit(team)}>Modifier</DropdownMenu.Item>
          {/if}
          {#if canDelete}
            <DropdownMenu.Item variant="destructive" onclick={() => remove(team)}>
              Supprimer
            </DropdownMenu.Item>
          {/if}
        </DataTableRowActions>
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <div class="divide-y">
      {#each filtered as team (team.id)}
        <button class="w-full text-left py-3 space-y-1" onclick={() => openRoster(team)}>
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium">{team.name}</p>
            <span class="text-xs text-muted-foreground">{team.divisionLabel}</span>
          </div>
          <p class="text-xs text-muted-foreground">
            {team.championshipLabel} · {team.rosterCount} joueur(s)
          </p>
          <p class="text-xs text-muted-foreground">
            Capitaine : {staffLabel(team.captain)}
          </p>
        </button>
      {/each}
    </div>
  {/snippet}
</DataTable>

<TeamFormSheet bind:open={formOpen} team={editing} {seasonCode} onSaved={() => reload()} />
<TeamRosterSheet bind:open={rosterOpen} {detail} {members} canWrite={canWrite} onSaved={() => reload()} />
<ChampionshipDaysSheet
  bind:open={daysOpen}
  championship={daysChampionship}
  {days}
  {seasonCode}
  {canWrite}
  onSaved={() => reload()}
/>
