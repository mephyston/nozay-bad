<script lang="ts">
  import {
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    Table,
    Badge,
    Button,
    dockDePage,
    uiConfirm,
    softNavigate,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { Trophy, Plus, CalendarDays } from '@lucide/svelte';
  import TeamsList from './TeamsList.svelte';
  import {
    detailDEquipe,
    gestesDEquipeAuTableau,
    nomDeStaff,
    type EquipeLike
  } from './teams-row-model';
  import TeamFormSheet from '../../save-team/ui/TeamFormSheet.svelte';
  import TeamRosterSheet from '../../get-team/ui/TeamRosterSheet.svelte';
  import TeamFixturesSheet from '../../save-fixture/ui/TeamFixturesSheet.svelte';
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
    teamPrefix,
    canWrite = false,
    canDelete = false,
    endpoint = '/admin/api/teams/teams'
  }: {
    teams: TeamListItem[];
    members: Array<{ licence: string; firstName: string; lastName: string; photoUpdatedAt?: number | null }>;
    days: ChampionshipDayItem[];
    daysChampionship: Championship;
    seasonCode: string;
    /** Préfixe des équipes du club, transmis au formulaire. */
    teamPrefix: string;
    canWrite?: boolean;
    canDelete?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  let search = $state('');
  let formOpen = $state(false);
  let editing = $state<TeamListItem | null>(null);
  let rosterOpen = $state(false);
  let fixturesOpen = $state(false);
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

  /** Charge le détail d'une équipe, dont vivent les deux feuilles. */
  async function loadDetail(team: TeamListItem): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-team', teamId: team.id })
      });
      const payload = (await response.json()) as { data?: GetTeamOutput; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible.');

      detail = payload.data ?? null;
      return detail !== null;
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'Chargement impossible.');
      return false;
    }
  }

  async function openRoster(team: TeamListItem) {
    if (await loadDetail(team)) rosterOpen = true;
  }

  async function openFixtures(team: TeamListItem) {
    if (await loadDetail(team)) fixturesOpen = true;
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-team', teamId: team.id })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'La suppression a échoué.');
      }
      reload();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }

  /*
    Créer une équipe et ouvrir les journées descendent dans la barre du bas : ils
    vivaient en haut d'une barre d'outils qui défile avec la liste.
  */
  $effect(() => {
    const actions: SwipeAction[] = [];
    if (canWrite) {
      actions.push({ id: 'creer', label: 'Créer une équipe', icon: Plus, run: () => openCreate() });
    }
    actions.push({ id: 'journees', label: 'Journées du championnat', icon: CalendarDays, run: () => (daysOpen = true) });
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Gestes du championnat' });
  });

  /** Les gestes d'une équipe, déclarés une fois et servis au tableau comme à la liste. */
  const gestesDUneEquipe = {
    onRoster: (e: EquipeLike) => void openRoster(e as TeamListItem),
    onFixtures: (e: EquipeLike) => void openFixtures(e as TeamListItem),
    onEdit: (e: EquipeLike) => openEdit(e as TeamListItem),
    onDelete: (e: EquipeLike) => void remove(e as TeamListItem)
  };
</script>

<DataTable
  data={filtered}
  mobileSpacing="list"
  itemName="équipe"
  emptyIcon={Trophy}
  emptyTitle="Aucune équipe engagée"
  emptyDescription="Créez les équipes du club pour cette saison."
>
  {#snippet toolbar()}
    <DataTableToolbar bind:searchValue={search} searchPlaceholder="Équipe, championnat…" hasSearch dockSearch>
      {#snippet actions()}
        <!-- Sur téléphone, ces deux gestes vivent dans la barre du bas. -->
        <Button variant="outline" onclick={() => (daysOpen = true)} class="hidden md:inline-flex">
          <CalendarDays class="w-4 h-4" /> Journées
        </Button>
        {#if canWrite}
          <Button onclick={openCreate} class="hidden md:inline-flex">
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
          {nomDeStaff(team.captain)}
        {:else}
          <!--
            « Non désigné » ici et « Sans capitaine » sur la pastille de la liste : la
            colonne fournit le sujet, la pastille doit le porter. Voir la note du
            modèle de ligne.
          -->
          <Badge variant="warning">Non désigné</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-sm text-muted-foreground">{nomDeStaff(team.viceCaptain)}</Table.Cell>
      <Table.Cell class="text-center">{team.rosterCount}</Table.Cell>
      <Table.Cell>
        <!--
          Le menu du tableau et le balayage de la liste sont nourris par la **même**
          déclaration : c'est ce qui empêche leurs libellés de diverger.
        -->
        <DataTableRowActions>
          {#each gestesDEquipeAuTableau({ canWrite, canDelete }, gestesDUneEquipe) as action (action.id)}
            <DropdownMenu.Item
              variant={action.tone === 'destructive' ? 'destructive' : undefined}
              onclick={() => action.run(team as EquipeLike)}
            >
              {action.label}
            </DropdownMenu.Item>
          {/each}
        </DataTableRowActions>
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <TeamsList
      equipes={filtered as EquipeLike[]}
      droits={{ canWrite, canDelete }}
      emptyIcon={Trophy}
      emptyTitle="Aucune équipe engagée"
      emptyDescription="Créez les équipes du club pour cette saison."
      {...gestesDUneEquipe}
    />
  {/snippet}
</DataTable>

<TeamFormSheet bind:open={formOpen} team={editing} {seasonCode} {teamPrefix} onSaved={() => reload()} />
<TeamRosterSheet bind:open={rosterOpen} {detail} {members} canWrite={canWrite} onSaved={() => reload()} />
<TeamFixturesSheet bind:open={fixturesOpen} {detail} canWrite={canWrite} onSaved={() => reload()} />
<ChampionshipDaysSheet
  bind:open={daysOpen}
  championship={daysChampionship}
  {days}
  {seasonCode}
  {canWrite}
  onSaved={() => reload()}
/>
