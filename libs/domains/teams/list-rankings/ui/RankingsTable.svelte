<script lang="ts">
  import { Table, Badge, DataTable, DataTableToolbar, Select } from '@nba/ui';
  import { Trophy } from '@lucide/svelte';
  import { RANKINGS, type Ranking } from '../../shared/ranking';
  import type { RankingListItem, RankingDateSummary } from '../dto';

  type Discipline = 'singles' | 'doubles' | 'mixed';

  let {
    rows,
    availableDates,
    eloDate,
    onDateChange,
    canEdit = false,
    onEdit,
    saving = null
  }: {
    rows: RankingListItem[];
    availableDates: RankingDateSummary[];
    eloDate: string | null;
    onDateChange: (date: string) => void;
    /** L'écran laisse-t-il corriger ? Le refus tient de toute façon côté API. */
    canEdit?: boolean;
    onEdit?: (licence: string, field: Discipline, value: Ranking | null) => void;
    /** Licence en cours d'enregistrement : ses trois cellules se figent. */
    saving?: string | null;
  } = $props();

  /**
   * La valeur vide du sélecteur vaut `null` — **licencié non compétiteur** — et non `NC`,
   * qui est un classement à part entière : zéro point, mais alignable. Les confondre
   * ferait entrer en équipe quelqu'un qui n'y a pas sa place.
   */
  const EMPTY = '';

  function change(item: RankingListItem, field: Discipline, raw: string) {
    onEdit?.(item.licence, field, raw === EMPTY ? null : (raw as Ranking));
  }

  let search = $state('');

  const filtered = $derived(
    search.trim() === ''
      ? rows
      : rows.filter((row) => {
          const needle = search.trim().toLowerCase();
          return (
            row.lastName.toLowerCase().includes(needle) ||
            row.firstName.toLowerCase().includes(needle) ||
            row.licence.includes(needle)
          );
        })
  );

  /** Un classement absent n'est pas `NC` : c'est un licencié non compétiteur. */
  function rankingLabel(value: string | null): string {
    return value ?? '—';
  }
</script>

<DataTable
  data={filtered}
  itemName="classement"
  emptyIcon={Trophy}
  emptyTitle="Aucun classement"
  emptyDescription="Importez un export ELO Poona pour alimenter les valeurs d'équipe."
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={search}
      searchPlaceholder="Nom, prénom ou licence…"
      hasSearch
    >
      {#snippet actions()}
        {#if availableDates.length > 0}
          <div class="w-[220px]">
            <Select
              value={eloDate ?? ''}
              onchange={(e) => onDateChange((e.currentTarget as HTMLSelectElement).value)}
              aria-label="Date des classements"
            >
              {#each availableDates as date (date.eloDate)}
                <option value={date.eloDate}>{date.eloDate} — {date.players} joueur(s)</option>
              {/each}
            </Select>
          </div>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet header()}
    <Table.Head>Licence</Table.Head>
    <Table.Head>Nom</Table.Head>
    <Table.Head>Catégorie</Table.Head>
    <Table.Head class="text-center">Simple</Table.Head>
    <Table.Head class="text-center">Double</Table.Head>
    <Table.Head class="text-center">Mixte</Table.Head>
    <Table.Head class="text-center">CPPH</Table.Head>
    <Table.Head>Statut</Table.Head>
  {/snippet}

  {#snippet row(item: RankingListItem)}
    <!-- `DataTable` rend ce snippet tel quel : la ligne est à la charge de l'appelant. -->
    <Table.Row>
      <Table.Cell class="font-mono text-xs">{item.licence}</Table.Cell>
      <Table.Cell class="font-medium">
        {item.lastName} {item.firstName}
        <span class="text-muted-foreground text-xs ml-1">({item.gender})</span>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground text-sm">{item.category ?? '—'}</Table.Cell>
      {#each ['singles', 'doubles', 'mixed'] as const as field (field)}
        <Table.Cell class="text-center">
          {#if canEdit}
            <Select
              value={item[field] ?? EMPTY}
              disabled={saving === item.licence}
              onchange={(e) => change(item, field, (e.currentTarget as HTMLSelectElement).value)}
              aria-label={`Classement ${field} de ${item.lastName} ${item.firstName}`}
            >
              <option value={EMPTY}>— non compétiteur</option>
              {#each RANKINGS as ranking (ranking)}
                <option value={ranking}>{ranking}</option>
              {/each}
            </Select>
          {:else}
            {rankingLabel(item[field])}
          {/if}
        </Table.Cell>
      {/each}
      <Table.Cell class="text-center text-xs text-muted-foreground">
        {item.cpphSingles ?? '—'} / {item.cpphDoubles ?? '—'} / {item.cpphMixed ?? '—'}
      </Table.Cell>
      <Table.Cell>
        <div class="flex flex-wrap gap-1">
          {#if !item.isMember}
            <!-- Signalé en permanence : ce joueur n'est alignable dans aucune composition. -->
            <Badge variant="destructive">Pas adhérent</Badge>
          {/if}
          {#if item.mutation !== 'none'}
            <Badge variant="warning">Muté</Badge>
          {/if}
          {#if item.source === 'manuel'}
            <Badge variant="outline">Saisi à la main</Badge>
          {/if}
        </div>
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <div class="divide-y">
      {#each filtered as item (item.id)}
        <div class="py-3 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium">{item.lastName} {item.firstName}</p>
            {#if !item.isMember}
              <Badge variant="destructive">Pas adhérent</Badge>
            {/if}
          </div>
          <p class="text-xs text-muted-foreground">
            {item.category ?? '—'} · {rankingLabel(item.singles)} /
            {rankingLabel(item.doubles)} / {rankingLabel(item.mixed)}
          </p>
        </div>
      {/each}
    </div>
  {/snippet}
</DataTable>
