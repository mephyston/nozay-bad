<script lang="ts">
  import { Plus, Edit, Ban, Users, RotateCcw, CalendarPlus } from '@lucide/svelte';
  import {
    Button,
    Input,
    Select,
    Badge,
    Card,
    Table,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FormField,
    FormSheet,
    Sheet,
    submitForm,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
  import { DEFAULT_MIN_PLAYERS } from '../../../shared/open-play';

  /**
   * Les séances de jeu libre, vues du bureau.
   *
   * Ce que le tableur ne donnait pas : combien de joueurs sont réellement attendus
   * (invités compris), lesquelles ont franchi leur seuil sans trouver d'ouvreur, et qui
   * vient — à la demande, parce qu'une liste nominative n'a pas à descendre avec la page.
   */

  interface GuestName { firstName: string; lastName: string }
  interface SessionRow {
    id: number; date: string; startTime: string; endTime: string;
    venueId: number; venue: { name: string } | null;
    minPlayers: number; status: 'open' | 'confirmed' | 'cancelled';
    openerFirstName: string | null; openerLastName: string | null;
    label: string | null; notes: string | null; cancelledReason: string | null;
    registrationCount: number; guestCount: number; playerCount: number; needsOpener: boolean;
  }
  interface VenueRow { id: number; name: string }
  interface RegistrationRow {
    id: number; licence: string; firstName: string; lastName: string;
    email: string; guests: GuestName[];
  }

  interface SlotRow { id: number; weekday: number; startTime: string; endTime: string; venue: { name: string } | null }

  let {
    sessions = [], venues = [], slots = [],
    canWrite = false, canReadRegistrations = false,
    endpoint = '/admin/api/schedules/jeu-libre'
  } = $props<{
    sessions: SessionRow[]; venues: VenueRow[]; slots?: SlotRow[];
    canWrite?: boolean; canReadRegistrations?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  const WEEKDAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  let editingId = $state<number | null>(null);
  let date = $state('');
  let startTime = $state('14:00');
  let endTime = $state('17:00');
  let venueId = $state(venues[0] ? String(venues[0].id) : '');
  let minPlayers = $state(String(DEFAULT_MIN_PLAYERS));
  let label = $state('');
  let notes = $state('');

  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');
  let onlyToStaff = $state(false);

  let showGenerateSheet = $state(false);
  let genFrom = $state('');
  let genTo = $state('');
  let genMinPlayers = $state(String(DEFAULT_MIN_PLAYERS));
  let genSlotIds = $state<number[]>([]);

  /**
   * Panneau des inscrits, chargé à la demande.
   *
   * Rendu dans un `Sheet` et non plus en pied de page : la liste s'ouvrait sous le
   * tableau, c'est-à-dire hors de l'écran dès que la saison comptait quelques séances.
   * Sur téléphone, appuyer sur « Inscrits » ne semblait rien faire. Même parade que le
   * panneau des inscrits d'un rendez-vous, et pour la même raison : rien à soumettre
   * ici, donc un `Sheet` nu plutôt qu'un `FormSheet` détourné.
   */
  let showRegistrationsSheet = $state(false);
  let openedSession = $state<SessionRow | null>(null);
  let registrations = $state<RegistrationRow[] | null>(null);
  let totals = $state<{ members: number; guests: number; players: number } | null>(null);

  const filtered = $derived(
    sessions.filter((row: SessionRow) => {
      if (onlyToStaff && !row.needsOpener) return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        row.date.includes(term) ||
        (row.venue?.name ?? '').toLowerCase().includes(term) ||
        (row.label ?? '').toLowerCase().includes(term)
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
    return response.json() as Promise<{ data?: unknown }>;
  }

  function resetForm() {
    editingId = null;
    date = '';
    startTime = '14:00';
    endTime = '17:00';
    venueId = venues[0] ? String(venues[0].id) : '';
    minPlayers = String(DEFAULT_MIN_PLAYERS);
    label = '';
    notes = '';
    errorMsg = '';
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(row: SessionRow) {
    editingId = row.id;
    date = row.date;
    startTime = row.startTime;
    endTime = row.endTime;
    venueId = String(row.venueId);
    minPlayers = String(row.minPlayers);
    label = row.label ?? '';
    notes = row.notes ?? '';
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
        if (!date) return 'Choisissez une date.';
        // Le serveur le refuse aussi ; autant le dire avant l'aller-retour.
        if (startTime >= endTime) return "L'heure de fin doit suivre l'heure de début.";
        return null;
      },
      submit: () =>
        post(
          {
            action: id ? 'update' : 'create',
            ...(id ? { id } : {}),
            venueId: Number(venueId),
            date, startTime, endTime,
            minPlayers: Number(minPlayers),
            label: label.trim() || null,
            notes: notes.trim() || null
          },
          id ? 'La modification a échoué.' : 'La création a échoué.'
        ),
      success: id ? 'Séance mise à jour.' : 'Séance ajoutée.',
      close: () => { resetForm(); showFormSheet = false; },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    busy = false;
  }

  function openGenerateForm() {
    // Par défaut, tous les créneaux de jeu libre de la saison : le cas courant est
    // « déroule-moi la période », pas « choisis-m'en un ».
    genSlotIds = slots.map((slot: SlotRow) => slot.id);
    genFrom = '';
    genTo = '';
    genMinPlayers = String(DEFAULT_MIN_PLAYERS);
    errorMsg = '';
    showGenerateSheet = true;
  }

  function toggleSlot(id: number) {
    genSlotIds = genSlotIds.includes(id)
      ? genSlotIds.filter((slotId) => slotId !== id)
      : [...genSlotIds, id];
  }

  async function generate(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    await submitForm({
      validate: () => {
        if (!genFrom || !genTo) return 'Choisissez une période.';
        if (genTo < genFrom) return 'La fin de période doit suivre son début.';
        if (genSlotIds.length === 0) return 'Choisissez au moins un créneau.';
        return null;
      },
      submit: async () => {
        const payload = await post(
          {
            action: 'generate',
            from: genFrom,
            to: genTo,
            slotIds: genSlotIds,
            minPlayers: Number(genMinPlayers)
          },
          'La génération a échoué.'
        );
        const data = payload.data as { created: number; skipped: number };
        // Le décompte compte : sans lui, le bureau rejouerait la génération en croyant
        // qu'elle n'a rien fait, alors qu'elle est simplement rejouable.
        generated = data;
      },
      success: '',
      close: () => { showGenerateSheet = false; },
      onError: (message) => { errorMsg = message; }
    });

    busy = false;
    if (generated) {
      flashAndReload(
        generated.created === 0
          ? `Aucune nouvelle séance : les ${generated.skipped} de la période existaient déjà.`
          : `${generated.created} séance${generated.created > 1 ? 's' : ''} créée${generated.created > 1 ? 's' : ''}${generated.skipped > 0 ? `, ${generated.skipped} existaient déjà` : ''}.`
      );
    }
  }

  let generated = $state<{ created: number; skipped: number } | null>(null);

  async function cancel(row: SessionRow) {
    const reason = window.prompt(
      "Pourquoi la séance est-elle annulée ? L'adhérent inscrit lira ce motif.",
      row.cancelledReason ?? ''
    );
    // `null` = fenêtre fermée ; une chaîne vide serait un motif absent, que le serveur
    // refuse — autant ne rien envoyer.
    if (reason === null || !reason.trim()) return;
    try {
      await post({ action: 'update', id: row.id, status: 'cancelled', cancelledReason: reason.trim() }, "L'annulation a échoué.");
      flashAndReload('Séance annulée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'annulation a échoué.");
    }
  }

  async function reopen(row: SessionRow) {
    const confirmed = await uiConfirm({
      title: 'Rouvrir cette séance ?',
      description: 'Les inscriptions redeviennent possibles, et le motif d’annulation disparaît.',
      confirmLabel: 'Rouvrir'
    });
    if (!confirmed) return;
    try {
      await post({ action: 'update', id: row.id, status: 'open' }, 'La réouverture a échoué.');
      flashAndReload('Séance rouverte.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La réouverture a échoué.');
    }
  }

  async function showRegistrations(row: SessionRow) {
    openedSession = row;
    showRegistrationsSheet = true;
    registrations = null;
    totals = null;
    try {
      const payload = await post({ action: 'registrations', id: row.id }, 'Lecture impossible.');
      const data = payload.data as { registrations: RegistrationRow[]; totals: typeof totals };
      registrations = data.registrations;
      totals = data.totals;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lecture impossible.');
      showRegistrationsSheet = false;
      openedSession = null;
    }
  }

  function statusLabel(row: SessionRow): { text: string; variant: 'primary-soft' | 'outline' | 'destructive' } {
    if (row.status === 'cancelled') return { text: 'Annulée', variant: 'destructive' };
    if (row.openerFirstName) {
      return { text: `${row.openerFirstName} ${(row.openerLastName ?? '').charAt(0)}.`, variant: 'primary-soft' };
    }
    if (row.needsOpener) return { text: 'À pourvoir', variant: 'destructive' };
    return { text: 'Ouverte', variant: 'outline' };
  }
</script>

{#if canWrite && venues.length === 0}
  <p class="text-muted-foreground mb-6 text-sm">
    Enregistrez d'abord un gymnase : une séance s'y rattache obligatoirement.
  </p>
{/if}

<DataTable
  data={filtered}
  mobileSpacing="spaced"
  emptyTitle="Aucune séance"
  emptyDescription={searchTerm.trim() || onlyToStaff
    ? 'Aucune séance ne correspond à votre recherche.'
    : 'Ajoutez les séances de jeu libre à venir.'}
>
  {#snippet toolbar()}
    <DataTableToolbar bind:searchValue={searchTerm} searchPlaceholder="Rechercher une séance..." hasFilters={false}>
      {#snippet actions()}
        <Button
          variant={onlyToStaff ? 'default' : 'outline'}
          onclick={() => (onlyToStaff = !onlyToStaff)}
          class="h-9 shrink-0 gap-1.5 text-sm font-semibold"
        >
          À pourvoir
        </Button>
        {#if canWrite && slots.length > 0}
          <Button variant="outline" onclick={openGenerateForm} class="h-9 shrink-0 gap-1.5 font-semibold">
            <CalendarPlus class="h-4 w-4" />
            <span>Programmer les séances récurrentes</span>
          </Button>
        {/if}
        {#if canWrite && venues.length > 0}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvelle séance</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filtered as row (row.id)}
      {@const status = statusLabel(row)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">
                {row.date}
                <span class="tabular-nums font-normal"> {row.startTime}–{row.endTime}</span>
              </h4>
              <p class="mt-1 text-xs text-muted-foreground">
                {row.venue?.name ?? '—'} · {row.playerCount} / {row.minPlayers} joueurs
              </p>
            </div>
            <Badge variant={status.variant} size="xs">{status.text}</Badge>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
            {#if canReadRegistrations}
              <Button variant="outline" size="sm" onclick={() => showRegistrations(row)} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                <Users class="h-3.5 w-3.5" />
                <span>Inscrits</span>
              </Button>
            {/if}
            {#if canWrite}
              <Button variant="outline" size="sm" onclick={() => startEdit(row)} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                <Edit class="h-3.5 w-3.5" />
                <span>Modifier</span>
              </Button>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  {/snippet}

  {#snippet header()}
    <Table.Head>Date</Table.Head>
    <Table.Head>Horaire</Table.Head>
    <Table.Head>Gymnase</Table.Head>
    <Table.Head>Joueurs</Table.Head>
    <Table.Head>Ouvreur</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(session)}
    {@const status = statusLabel(session)}
    <Table.Row class={session.status === 'cancelled' ? 'opacity-60' : ''}>
      <Table.Cell class="font-medium tabular-nums">{session.date}</Table.Cell>
      <Table.Cell class="tabular-nums">{session.startTime}–{session.endTime}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{session.venue?.name ?? '—'}</Table.Cell>
      <Table.Cell class="tabular-nums">
        <span class="text-foreground">{session.playerCount} / {session.minPlayers}</span>
        {#if session.guestCount > 0}
          <span class="block text-xs text-muted-foreground">
            dont {session.guestCount} invité{session.guestCount > 1 ? 's' : ''}
          </span>
        {/if}
      </Table.Cell>
      <Table.Cell>
        <Badge variant={status.variant}>{status.text}</Badge>
      </Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          {#if canReadRegistrations}
            <DropdownMenu.Item onclick={() => showRegistrations(session)} class="cursor-pointer">
              <Users class="mr-2 h-3.5 w-3.5" />
              Voir les inscrits
            </DropdownMenu.Item>
          {/if}
          {#if canWrite}
            <DropdownMenu.Item onclick={() => startEdit(session)} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />
              Modifier
            </DropdownMenu.Item>
            {#if session.status === 'cancelled'}
              <DropdownMenu.Item onclick={() => reopen(session)} class="cursor-pointer">
                <RotateCcw class="mr-2 h-3.5 w-3.5" />
                Rouvrir
              </DropdownMenu.Item>
            {:else}
              <DropdownMenu.Item onclick={() => cancel(session)} class="cursor-pointer text-destructive focus:text-destructive">
                <Ban class="mr-2 h-3.5 w-3.5" />
                Annuler la séance
              </DropdownMenu.Item>
            {/if}
          {/if}
        </DataTableRowActions>
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<Sheet.Root bind:open={showRegistrationsSheet}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Users class="h-5 w-5 text-primary" />
        Inscrits
      </Sheet.Title>
      <Sheet.Description>
        {openedSession
          ? `${openedSession.date} · ${openedSession.startTime}–${openedSession.endTime}`
          : ''}
      </Sheet.Description>
    </Sheet.Header>

    <div class="px-4 py-4">
      {#if registrations === null}
        <p class="text-sm text-muted-foreground">Chargement…</p>
      {:else if registrations.length === 0}
        <p class="text-sm text-muted-foreground">Personne pour l'instant.</p>
      {:else}
        <ul class="space-y-2">
          {#each registrations as registration (registration.id)}
            <li class="border-b border-border/50 pb-2 last:border-0">
              <p class="text-sm font-medium text-foreground">
                {registration.lastName} {registration.firstName}
                <span class="ml-2 text-xs font-normal text-muted-foreground">{registration.licence}</span>
              </p>
              {#each registration.guests as guest}
                <p class="ml-4 text-xs italic text-muted-foreground">
                  {guest.lastName} {guest.firstName} · invité
                </p>
              {/each}
            </li>
          {/each}
        </ul>
        {#if totals}
          <p class="mt-3 text-sm font-semibold text-foreground">
            {totals.players} personne{totals.players > 1 ? 's' : ''} attendue{totals.players > 1 ? 's' : ''}
            <span class="font-normal text-muted-foreground">
              — {totals.members} adhérent{totals.members > 1 ? 's' : ''}, {totals.guests} invité{totals.guests > 1 ? 's' : ''}
            </span>
          </p>
        {/if}
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

<FormSheet
  bind:open={showGenerateSheet}
  title="Programmer les séances récurrentes"
  description="Transforme les créneaux hebdomadaires de jeu libre en séances datées. Rejouable sans risque : les séances déjà créées sont laissées telles quelles, ouvreur compris."
  icon={CalendarPlus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Programmer"
  submittingLabel="Programmation…"
  onSubmit={generate}
>
  <div class="grid grid-cols-2 gap-3">
    <FormField id="gen-from" label="Du">
      <Input id="gen-from" type="date" bind:value={genFrom} />
    </FormField>
    <FormField id="gen-to" label="Au">
      <Input id="gen-to" type="date" bind:value={genTo} />
    </FormField>
  </div>

  <FormField id="gen-min" label="Joueurs nécessaires pour ouvrir">
    <Input id="gen-min" type="number" min="1" max="40" bind:value={genMinPlayers} />
  </FormField>

  <div class="space-y-2">
    <p class="text-sm font-medium text-foreground">Créneaux hebdomadaires à répéter</p>
    <p class="text-xs text-muted-foreground">
      Chaque créneau coché devient une séance à chacune de ses dates dans la période.
    </p>
    {#each slots as slot (slot.id)}
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={genSlotIds.includes(slot.id)}
          onchange={() => toggleSlot(slot.id)}
          aria-label={`${WEEKDAYS[slot.weekday]} ${slot.startTime}`}
          class="h-4 w-4 rounded border-border"
        />
        <span class="text-foreground">
          {WEEKDAYS[slot.weekday]} {slot.startTime}–{slot.endTime}
        </span>
        <span class="text-xs text-muted-foreground">{slot.venue?.name ?? '—'}</span>
      </label>
    {/each}
  </div>
</FormSheet>

<FormSheet
  bind:open={showFormSheet}
  title={editingId ? 'Modifier la séance' : 'Nouvelle séance'}
  description={editingId
    ? 'Les inscriptions déjà prises sont conservées.'
    : 'La séance est ouverte aux inscriptions dès son ajout.'}
  icon={editingId ? Edit : Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel={editingId ? 'Enregistrer' : 'Ajouter'}
  submittingLabel="Enregistrement…"
  onSubmit={save}
>
  <FormField id="op-date" label="Date">
    <Input id="op-date" type="date" bind:value={date} />
  </FormField>

  <div class="grid grid-cols-2 gap-3">
    <FormField id="op-start" label="Début">
      <Input id="op-start" type="time" bind:value={startTime} />
    </FormField>
    <FormField id="op-end" label="Fin">
      <Input id="op-end" type="time" bind:value={endTime} />
    </FormField>
  </div>

  <FormField id="op-venue" label="Gymnase">
    <Select id="op-venue" bind:value={venueId}>
      {#each venues as venue}
        <option value={String(venue.id)}>{venue.name}</option>
      {/each}
    </Select>
  </FormField>

  <FormField id="op-min" label="Joueurs nécessaires pour ouvrir">
    <Input id="op-min" type="number" min="1" max="40" bind:value={minPlayers} />
  </FormField>

  <FormField id="op-label" label="Intitulé (facultatif)">
    <Input id="op-label" bind:value={label} placeholder="Jeu libre des vacances" maxlength={120} />
  </FormField>

  <FormField id="op-notes" label="Consigne (facultatif)">
    <Input id="op-notes" bind:value={notes} placeholder="Clé à récupérer chez Robert" maxlength={500} />
  </FormField>
</FormSheet>
