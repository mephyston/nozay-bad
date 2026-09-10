<script lang="ts">
  import { Plus, Edit, Trash2, Eye, EyeOff } from '@lucide/svelte';
  import {
    Button,
    Input,
    Select,
    Checkbox,
    Label,
    Badge,
    Card,
    Table,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FormField,
    FormSheet,
    submitForm,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
  import { AUDIENCE_LABELS, WEEKDAY_LABELS } from '../../shared/schema';

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

  const filteredSlots = $derived(
    slots.filter((row: SlotRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        WEEKDAY_LABELS[row.weekday].toLowerCase().includes(term) ||
        AUDIENCE_LABELS[row.audience].toLowerCase().includes(term) ||
        (row.label ?? '').toLowerCase().includes(term) ||
        (row.venue?.name ?? '').toLowerCase().includes(term)
      );
    })
  );

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
      success: id ? 'Créneau mis à jour.' : 'Créneau ajouté.',
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
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
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
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
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
  emptyTitle="Aucun créneau"
  emptyDescription={searchTerm.trim()
    ? 'Aucun créneau ne correspond à votre recherche.'
    : 'Ajoutez les créneaux de la saison.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un créneau..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if canWrite && venues.length > 0}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouveau créneau</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filteredSlots as row (row.id)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2" class:opacity-50={!row.active}>
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">
                {WEEKDAY_LABELS[row.weekday]}
                <span class="tabular-nums font-normal"> {row.startTime}–{row.endTime}</span>
              </h4>
              <p class="mt-1 text-xs text-muted-foreground">
                {row.label ?? AUDIENCE_LABELS[row.audience]} · {row.venue?.name ?? '—'}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap justify-end gap-1">
              {#if row.indiv}
                <Badge variant="secondary" size="xs">Indiv</Badge>
              {/if}
              <Badge variant={row.active ? 'primary-soft' : 'outline'} size="xs">
                {row.active ? 'Affiché' : 'Masqué'}
              </Badge>
            </div>
          </div>

          {#if canWrite}
            <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
              <Button variant="outline" size="sm" onclick={() => startEdit(row)} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                <Edit class="h-3.5 w-3.5" />
                <span>Modifier</span>
              </Button>
              <Button variant="outline" size="sm" onclick={() => toggle(row)} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                {#if row.active}
                  <EyeOff class="h-3.5 w-3.5" />
                  <span>Masquer</span>
                {:else}
                  <Eye class="h-3.5 w-3.5" />
                  <span>Afficher</span>
                {/if}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => remove(row)}
                class="h-8 flex-1 gap-1.5 border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </Button>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/each}
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
      <Table.Cell class="font-medium">{WEEKDAY_LABELS[slot.weekday]}</Table.Cell>
      <Table.Cell class="tabular-nums">{slot.startTime}–{slot.endTime}</Table.Cell>
      <Table.Cell>
        <span class="block text-foreground">
          {AUDIENCE_LABELS[slot.audience]}
          {#if slot.indiv}
            <Badge variant="secondary" size="xs" class="ml-1 align-middle">Indiv</Badge>
          {/if}
        </span>
        {#if slot.label}
          <span class="block text-xs text-muted-foreground">{slot.label}</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{slot.venue?.name ?? '—'}</Table.Cell>
      <Table.Cell>
        <Badge variant={slot.active ? 'primary-soft' : 'outline'}>
          {slot.active ? 'Affiché' : 'Masqué'}
        </Badge>
      </Table.Cell>
      <Table.Cell class="relative text-right">
        {#if canWrite}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <DropdownMenu.Item onclick={() => startEdit(slot)} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />
              Modifier
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => toggle(slot)} class="cursor-pointer">
              {#if slot.active}
                <EyeOff class="mr-2 h-3.5 w-3.5" />
                Masquer du site
              {:else}
                <Eye class="mr-2 h-3.5 w-3.5" />
                Réafficher
              {/if}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => remove(slot)}
              class="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 class="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenu.Item>
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
    <Select id="slot-day" bind:value={weekday}>
      {#each [1, 2, 3, 4, 5, 6, 7] as day}
        <option value={String(day)}>{WEEKDAY_LABELS[day]}</option>
      {/each}
    </Select>
  </FormField>

  <div class="grid grid-cols-2 gap-3">
    <FormField id="slot-start" label="Début">
      <Input id="slot-start" type="time" bind:value={startTime} />
    </FormField>
    <FormField id="slot-end" label="Fin">
      <Input id="slot-end" type="time" bind:value={endTime} />
    </FormField>
  </div>

  <FormField id="slot-audience" label="Groupe">
    <Select id="slot-audience" bind:value={audience}>
      {#each Object.entries(AUDIENCE_LABELS) as [value, text]}
        <option {value}>{text}</option>
      {/each}
    </Select>
  </FormField>

  <FormField id="slot-venue" label="Gymnase">
    <Select id="slot-venue" bind:value={venueId}>
      {#each venues as venue}
        <option value={String(venue.id)}>{venue.name}</option>
      {/each}
    </Select>
  </FormField>

  <FormField id="slot-label" label="Intitulé (facultatif)">
    <Input id="slot-label" bind:value={label} placeholder="Remplace le nom du groupe sur le site" maxlength={120} />
  </FormField>

  <!-- Le public ne dit pas si le créneau ouvre des indiv : deux des quatre créneaux
       compétiteurs seulement en portent. Ce marqueur ne touche pas au site, il ne parle
       qu'à la programmation des soirées. -->
  <div class="flex items-start gap-2.5 rounded-md border border-border p-3">
    <Checkbox id="slot-indiv" bind:checked={indiv} />
    <div class="grid gap-0.5">
      <Label for="slot-indiv" class="text-sm font-medium">Séances individuelles</Label>
      <p class="text-xs text-muted-foreground">
        L'entraîneur y prend des candidats au début du créneau. La programmation des soirées d'indiv ne propose que les créneaux cochés.
      </p>
    </div>
  </div>
</FormSheet>
