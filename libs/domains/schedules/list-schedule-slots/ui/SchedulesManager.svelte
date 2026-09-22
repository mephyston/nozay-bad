<script lang="ts">
  import { Plus, Edit, CalendarClock } from '@lucide/svelte';
  import {
    Button,
    Input,
    Badge,
    Table,
    ChoiceField,
    DateTimeField,
    SwitchField,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FilterSheet,
    FormField,
    FormSheet,
    RowActionItems,
    dockDePage,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { AUDIENCE_LABELS, WEEKDAY_LABELS } from '../../shared/schema';
  import SchedulesList from './SchedulesList.svelte';
  import {
    creneauxFiltres,
    gestesDeCreneau,
    libelleDeGroupe,
    libelleDeJour,
    signalementsDeCreneau,
    VISIBILITES,
    type VisibiliteDeCreneau
  } from './schedules-row-model';

  interface SlotRow {
    id: number; weekday: number; startTime: string; endTime: string;
    audience: keyof typeof AUDIENCE_LABELS; label: string | null; active: boolean;
    /** Ouvre des séances individuelles : la programmation des soirées d'indiv part de là. */
    indiv: boolean;
    venueId: number; venue: { name: string } | null;
  }
  interface VenueRow { id: number; name: string }

  let {
    slots = [],
    venues = [],
    canWrite = false,
    endpoint = '/admin/api/schedules/schedules'
  } = $props<{
    slots: SlotRow[]; venues: VenueRow[]; canWrite?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let editingId = $state<number | null>(null);
  let weekday = $state('1');
  let startTime = $state('18:00');
  let endTime = $state('19:30');
  let audience = $state<keyof typeof AUDIENCE_LABELS>('jeunes');
  let venueId = $state(venues[0] ? String(venues[0].id) : '');
  let label = $state('');
  let indiv = $state(false);
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  let visibilite = $state<VisibiliteDeCreneau>('tous');
  let filtresOuverts = $state(false);

  const filteredSlots = $derived(
    creneauxFiltres(slots as SlotRow[], { recherche: searchTerm, visibilite })
  );

  /* Les gestes, dans le vocabulaire du modèle : le menu du tableau et le balayage de
     la liste les rendent tous deux, à partir d'une seule déclaration. */
  const gestes = $derived({
    canWrite,
    onEdit: (slot: SlotRow) => startEdit(slot),
    onToggle: (slot: SlotRow) => toggle(slot),
    onDelete: (slot: SlotRow) => remove(slot)
  });

  /*
    Créer descend dans la barre du bas. Le bouton vivait en haut d'une barre d'outils
    qui défile avec la liste : passé le mercredi, il n'était plus à l'écran.
  */
  $effect(() => {
    if (!canWrite || venues.length === 0) return;
    const actions: SwipeAction[] = [
      { id: 'nouveau', label: 'Nouveau créneau', icon: CalendarClock, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouveau créneau' });
  });

  async function post(body: unknown, fallback: string) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  function resetForm() {
    editingId = null;
    weekday = '1';
    startTime = '18:00';
    endTime = '19:30';
    audience = 'jeunes';
    venueId = venues[0] ? String(venues[0].id) : '';
    label = '';
    indiv = false;
    errorMsg = '';
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(row: SlotRow) {
    editingId = row.id;
    weekday = String(row.weekday);
    startTime = row.startTime;
    endTime = row.endTime;
    audience = row.audience;
    venueId = String(row.venueId);
    label = row.label ?? '';
    indiv = row.indiv;
    errorMsg = '';
    showFormSheet = true;
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const id = editingId;

    await submitForm({
      validate: () => {
        if (!venueId) return 'Choisissez un gymnase.';
        // Un créneau qui finit avant de commencer s'affiche sans erreur et fausse tout
        // le tableau ; le serveur le refuse, autant le dire tout de suite.
        if (startTime >= endTime) return "L'heure de fin doit suivre l'heure de début.";
        return null;
      },
      submit: () =>
        post(
          id
            ? {
                action: 'update', id, venueId: Number(venueId), weekday: Number(weekday),
                startTime, endTime, audience, label: label.trim() || null, indiv
              }
            : {
                action: 'create', venueId: Number(venueId), weekday: Number(weekday),
                startTime, endTime, audience, label: label.trim() || undefined, indiv
              },
          id ? 'La modification a échoué.' : 'La création a échoué.'
        ),
      close: () => {
        resetForm();
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }

  async function toggle(row: SlotRow) {
    try {
      await post({ action: 'update', id: row.id, active: !row.active }, "L'opération a échoué.");
      flashAndReload(row.active ? 'Créneau masqué du site.' : 'Créneau réaffiché.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  async function remove(row: SlotRow) {
    const confirmed = await uiConfirm({
      title: 'Supprimer ce créneau ?',
      description: "Pour le retirer temporairement du site, préférez le masquer : l'historique est conservé.",
      confirmLabel: 'Supprimer', destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Créneau supprimé.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

{#if canWrite && venues.length === 0}
  <p class="text-muted-foreground mb-6 text-sm">
    Enregistrez d'abord un gymnase : un créneau s'y rattache obligatoirement.
  </p>
{/if}

<DataTable
  data={filteredSlots}
  mobileSpacing="list"
  emptyTitle="Aucun créneau"
  emptyDescription={searchTerm.trim() || visibilite !== 'tous'
    ? 'Aucun créneau ne correspond à ces critères.'
    : 'Ajoutez les créneaux de la saison.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un créneau..."
      dockSearch
      hasFilters={true}
      filtersActive={visibilite !== 'tous'}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={visibilite === 'tous'
        ? []
        : [
            {
              id: 'visibilite',
              label: VISIBILITES.find((v) => v.value === visibilite)?.label ?? '',
              onRemove: () => (visibilite = 'tous')
            }
          ]}
    >
      {#snippet filters()}
        {@render criteres()}
      {/snippet}
      {#snippet actions()}
        <!-- Sur téléphone, ce geste vit dans la barre du bas. -->
        {#if canWrite && venues.length > 0}
          <Button onclick={openAddForm} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouveau créneau</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <SchedulesList
      creneaux={filteredSlots}
      {...gestes}
      emptyTitle="Aucun créneau"
      emptyDescription={searchTerm.trim() || visibilite !== 'tous'
        ? 'Aucun créneau ne correspond à ces critères.'
        : 'Ajoutez les créneaux de la saison.'}
    />
  {/snippet}

  {#snippet header()}
    <Table.Head>Jour</Table.Head>
    <Table.Head>Horaire</Table.Head>
    <Table.Head>Groupe</Table.Head>
    <Table.Head>Gymnase</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(slot)}
    <Table.Row class={slot.active ? '' : 'opacity-60'}>
      <Table.Cell class="font-medium">{libelleDeJour(slot.weekday)}</Table.Cell>
      <Table.Cell class="tabular-nums">{slot.startTime}–{slot.endTime}</Table.Cell>
      <Table.Cell>
        <span class="block text-foreground">{libelleDeGroupe(slot.audience)}</span>
        {#if slot.label}
          <span class="block text-xs text-muted-foreground">{slot.label}</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{slot.venue?.name ?? '—'}</Table.Cell>
      <Table.Cell>
        <!-- Les mêmes pastilles que la liste au doigt : un écran, un vocabulaire.
             « Affiché » est le cas courant et ne s'annonce pas. -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each signalementsDeCreneau(slot) as pastille (pastille.label)}
            <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
          {/each}
        </div>
      </Table.Cell>
      <Table.Cell class="relative text-right">
        {@const actions = gestesDeCreneau(slot, gestes)}
        {#if actions.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems {actions} item={slot} />
          </DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<FormSheet
  bind:open={showFormSheet}
  title={editingId ? 'Modifier le créneau' : 'Nouveau créneau'}
  description={editingId
    ? 'Le créneau reste rattaché à la saison en cours.'
    : 'Le créneau est affiché sur le site dès son ajout.'}
  icon={editingId ? Edit : Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel={editingId ? 'Enregistrer' : 'Ajouter'}
  submittingLabel="Enregistrement…"
  onSubmit={save}
>
  <FormField id="slot-day" label="Jour">
    <ChoiceField
      id="slot-day"
      label="Jour"
      bind:value={weekday}
      options={[1, 2, 3, 4, 5, 6, 7].map((day) => ({
        value: String(day),
        label: libelleDeJour(day)
      }))}
    />
  </FormField>

  <div class="grid grid-cols-2 gap-3">
    <FormField id="slot-start" label="Début">
      <DateTimeField id="slot-start" label="Début" type="time" bind:value={startTime} />
    </FormField>
    <FormField id="slot-end" label="Fin">
      <DateTimeField id="slot-end" label="Fin" type="time" bind:value={endTime} min={startTime} />
    </FormField>
  </div>

  <FormField id="slot-audience" label="Groupe">
    <ChoiceField
      id="slot-audience"
      label="Groupe"
      value={audience}
      onChange={(v) => (audience = v as typeof audience)}
      options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
    />
  </FormField>

  <FormField id="slot-venue" label="Gymnase">
    <ChoiceField
      id="slot-venue"
      label="Gymnase"
      bind:value={venueId}
      placeholder="Choisir un gymnase…"
      options={venues.map((venue: VenueRow) => ({ value: String(venue.id), label: venue.name }))}
    />
  </FormField>

  <FormField id="slot-label" label="Intitulé (facultatif)">
    <Input id="slot-label" bind:value={label} placeholder="Remplace le nom du groupe sur le site" maxlength={120} />
  </FormField>

  <!-- Le public ne dit pas si le créneau ouvre des indiv : deux des quatre créneaux
       compétiteurs seulement en portent. Ce marqueur ne touche pas au site, il ne parle
       qu'à la programmation des soirées.

       Un interrupteur et non une case : la question est « est-ce actif ? », pas
       « lequel ? » — et son état se lit alors au même endroit que sur toute autre
       rangée de réglage. -->
  <SwitchField
    id="slot-indiv"
    label="Séances individuelles"
    hint="L'entraîneur y prend des candidats au début du créneau. La programmation des soirées d'indiv ne propose que les créneaux retenus."
    bind:checked={indiv}
  />
</FormSheet>

<!-- Les critères se posent derrière la loupe, jamais ailleurs. -->
{#snippet criteres()}
  <FormField id="filter-visibilite" label="Affichage">
    <ChoiceField
      id="filter-visibilite"
      label="Affichage"
      value={visibilite}
      onChange={(v) => (visibilite = v as VisibiliteDeCreneau)}
      options={VISIBILITES}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Un créneau masqué reste enregistré : il ne paraît simplement pas sur le site."
  resultCount={filteredSlots.length}
  itemName="créneau"
  onReset={() => (visibilite = 'tous')}
>
  {@render criteres()}
</FilterSheet>
