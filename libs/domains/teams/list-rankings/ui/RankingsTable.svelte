<script lang="ts">
  import {
    Table,
    Badge,
    ChoiceField,
    DataTable,
    DataTableToolbar,
    ResponsiveSheet,
    Select,
    dockDePage
  } from '@nba/ui';
  import RankingsList from './RankingsList.svelte';
  import {
    choixDeDate,
    classementOuTiret,
    signalementsDeJoueur,
    type ClassementLike
  } from './rankings-row-model';
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

  /*
    La date des classements est la **portée** de l'écran : ce qu'on regarde, et non ce
    qu'on y cherche ni ce qu'on y crée. Elle prend donc la pilule de la barre du bas,
    qui affiche la date courante — une portée qu'on ne voit pas ne se vérifie jamais.
  */
  let porteeOuverte = $state(false);

  $effect(() => {
    if (availableDates.length === 0) return;
    return dockDePage.declarerPortee({
      label: 'Classements arrêtés au',
      valeur: eloDate ?? '—',
      ouvrir: () => (porteeOuverte = true)
    });
  });
</script>

<DataTable
  data={filtered}
  mobileSpacing="list"
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
        <!-- Sur téléphone, la date vit dans la pilule de la barre du bas. -->
        {#if availableDates.length > 0}
          <div class="hidden w-[260px] md:block">{@render choixDeLaDate()}</div>
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
            {classementOuTiret(item[field])}
          {/if}
        </Table.Cell>
      {/each}
      <Table.Cell class="text-center text-xs text-muted-foreground">
        {item.cpphSingles ?? '—'} / {item.cpphDoubles ?? '—'} / {item.cpphMixed ?? '—'}
      </Table.Cell>
      <Table.Cell>
        <!-- Les mêmes signalements que la liste, depuis la même déclaration. -->
        <div class="flex flex-wrap gap-1">
          {#each signalementsDeJoueur(item as ClassementLike) as pastille (pastille.label)}
            <Badge variant={pastille.variant}>{pastille.label}</Badge>
          {/each}
        </div>
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <RankingsList
      joueurs={filtered as ClassementLike[]}
      {canEdit}
      {saving}
      onEdit={(licence, field, valeur) => onEdit?.(licence, field, valeur as never)}
      emptyIcon={Trophy}
      emptyTitle="Aucun classement"
      emptyDescription="Importez un export ELO Poona pour alimenter les valeurs d'équipe."
    />
  {/snippet}
</DataTable>

{#snippet choixDeLaDate()}
  <ChoiceField
    id="portee-date-classements"
    label="Date des classements"
    value={eloDate ?? ''}
    onChange={(v) => onDateChange(v)}
    options={choixDeDate(availableDates)}
  />
{/snippet}

<ResponsiveSheet
  bind:open={porteeOuverte}
  title="Classements affichés"
  description="Deux imports d’une même semaine se distinguent par leur nombre de joueurs ; choisir le mauvais fausse toutes les valeurs d’équipe."
  size="md"
>
  <div class="py-2">{@render choixDeLaDate()}</div>
</ResponsiveSheet>
