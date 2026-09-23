<script lang="ts">
  import { Plus, Edit, Ban, Users, RotateCcw, CalendarPlus } from '@lucide/svelte';
  import {
    Button,
    Input,
    Textarea,
    Badge,
    Table,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    ChoiceField,
    MultiChoiceField,
    FilterSheet,
    FormField,
    FormSheet,
    ResponsiveSheet,
    SwitchField,
    dockDePage,
    jourCourt,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { DEFAULT_MIN_PLAYERS } from '../../../shared/open-play';
  import OpenPlaySessionsList from './OpenPlaySessionsList.svelte';
  import { gestesPourSeance, type SeanceLike } from './open-play-row-model';

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

  /**
   * Annuler : un formulaire, et non plus `window.prompt`.
   *
   * La boîte native n'a ni le style de l'application, ni de place pour dire à qui ce
   * motif s'adresse — et sur un téléphone elle s'ouvre au milieu de l'écran, loin du
   * pouce. Elle bloque surtout tout le reste tant qu'elle est ouverte. Ce motif part
   * aux adhérents inscrits : il mérite un champ qu'on voit en l'écrivant.
   */
  let annulationOuverte = $state(false);
  let seanceAAnnuler = $state<SessionRow | null>(null);
  let motif = $state('');

  function openCancelForm(row: SessionRow) {
    seanceAAnnuler = row;
    motif = row.cancelledReason ?? '';
    errorMsg = '';
    annulationOuverte = true;
  }

  async function cancel(event: Event) {
    event.preventDefault();
    const row = seanceAAnnuler;
    if (!row) return;
    errorMsg = '';
    busy = true;

    await submitForm({
      // Le serveur refuse un motif vide ; autant le dire avant l'aller-retour.
      validate: () => (motif.trim() ? null : 'Dites pourquoi la séance est annulée.'),
      submit: () =>
        post(
          { action: 'update', id: row.id, status: 'cancelled', cancelledReason: motif.trim() },
          "L'annulation a échoué."
        ),
      close: () => {
        annulationOuverte = false;
        seanceAAnnuler = null;
        motif = '';
      },
      success: 'Séance annulée.',
      onError: (message) => { errorMsg = message; }
    });

    busy = false;
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
      uiAlert(error instanceof Error ? error.message : 'La réouverture a échoué.');
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
      uiAlert(error instanceof Error ? error.message : 'Lecture impossible.');
      showRegistrationsSheet = false;
      openedSession = null;
    }
  }

  /*
    Créer et programmer descendent dans la barre du bas : ils vivaient en haut d'une
    barre d'outils qui défile avec la liste, donc hors de vue dès la troisième séance.
  */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [];
    if (venues.length > 0) {
      actions.push({ id: 'nouvelle', label: 'Nouvelle séance', icon: Plus, run: () => openAddForm() });
    }
    if (slots.length > 0) {
      actions.push({
        id: 'programmer',
        label: 'Programmer les séances récurrentes',
        icon: CalendarPlus,
        run: () => openGenerateForm()
      });
    }
    if (actions.length === 0) return;
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Ajouter des séances' });
  });

  let filtresOuverts = $state(false);

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
  mobileSpacing="list"
  emptyTitle="Aucune séance"
  emptyDescription={searchTerm.trim() || onlyToStaff
    ? 'Aucune séance ne correspond à votre recherche.'
    : 'Ajoutez les séances de jeu libre à venir.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une séance..."
      dockSearch
      hasFilters={true}
      filtersActive={onlyToStaff}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={onlyToStaff
        ? [{ id: 'pourvoir', label: 'À pourvoir', onRemove: () => (onlyToStaff = false) }]
        : []}
    >
      {#snippet filters()}
        {@render criteres()}
      {/snippet}
      {#snippet actions()}
        <!-- Sur téléphone, ces deux gestes vivent dans la barre du bas. -->
        {#if canWrite && slots.length > 0}
          <Button variant="outline" onclick={openGenerateForm} class="hidden h-9 shrink-0 gap-1.5 font-semibold md:flex">
            <CalendarPlus class="h-4 w-4" />
            <span>Programmer les séances récurrentes</span>
          </Button>
        {/if}
        {#if canWrite && venues.length > 0}
          <Button onclick={openAddForm} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouvelle séance</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <OpenPlaySessionsList
      sessions={filtered}
      droits={{ canWrite, canReadRegistrations }}
      emptyTitle="Aucune séance"
      emptyDescription={searchTerm.trim() || onlyToStaff
        ? 'Aucune séance ne correspond à ces critères.'
        : 'Ajoutez les séances de jeu libre à venir.'}
      onRegistrations={(s) => showRegistrations(s as SessionRow)}
      onEdit={(s) => startEdit(s as SessionRow)}
      onCancel={(s) => openCancelForm(s as SessionRow)}
      onReopen={(s) => void reopen(s as SessionRow)}
    />
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
        <!--
          Le menu du tableau et le balayage de la liste sont nourris par la **même**
          déclaration : c'est ce qui empêche leurs libellés de diverger, comme ceux des
          adhérents l'ont fait entre les deux vues.
        -->
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          {#each gestesPourSeance(session as SeanceLike, { canWrite, canReadRegistrations }, { onRegistrations: (s) => showRegistrations(s as SessionRow), onEdit: (s) => startEdit(s as SessionRow), onCancel: (s) => openCancelForm(s as SessionRow), onReopen: (s) => void reopen(s as SessionRow) }) as action (action.id)}
            {@const Icone = action.icon}
            <DropdownMenu.Item
              onclick={() => action.run(session as SeanceLike)}
              class={`cursor-pointer ${action.tone === 'destructive' ? 'text-destructive focus:text-destructive' : ''}`}
            >
              {#if Icone}<Icone class="mr-2 h-3.5 w-3.5" />{/if}
              {action.label}
            </DropdownMenu.Item>
          {/each}
        </DataTableRowActions>
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<!--
  Le panneau des inscrits monte du bas, comme tout ce qui s'ouvre ici : un panneau
  latéral est un idiome de bureau, et sa croix en coin haut droit est le point le plus
  loin du pouce sur un téléphone.
-->
<ResponsiveSheet
  bind:open={showRegistrationsSheet}
  title="Inscrits"
  icon={Users}
  description={openedSession
    ? `${jourCourt(openedSession.date)} · ${openedSession.startTime}–${openedSession.endTime}`
    : ''}
  size="md"
>
  <!--
    La séance se nomme ici, et non dans la description : sous une barre de navigation,
    `ResponsiveSheet` réserve celle-ci aux technologies d'assistance — la hauteur d'un
    téléphone est rare. Or on arrive sur ce panneau depuis une liste de plusieurs
    séances : sans ce rappel, on ne sait plus lesquels inscrits on lit.
  -->
  {#snippet header()}
    {#if openedSession}
      <p class="text-muted-foreground mt-1 text-sm">
        {jourCourt(openedSession.date)} · {openedSession.startTime}–{openedSession.endTime}
      </p>
    {/if}
  {/snippet}

    <div class="py-2">
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
</ResponsiveSheet>

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

  <!--
    Les cases à cocher faisaient des cibles de 16 px empilées, et leur intitulé n'était
    pas un libellé de champ. Une rangée dit ce qui est retenu et mène à l'écran de
    choix, où chaque créneau a sa ligne.
  -->
  <FormField
    id="gen-slots"
    label="Créneaux hebdomadaires à répéter"
    hint="Chaque créneau retenu devient une séance à chacune de ses dates dans la période."
  >
    <MultiChoiceField
      id="gen-slots"
      label="Créneaux hebdomadaires à répéter"
      title="Créneaux à répéter"
      description="Seuls les créneaux de jeu libre peuvent être déroulés en séances."
      placeholder="Aucun"
      values={genSlotIds.map(String)}
      onChange={(v) => (genSlotIds = v.map(Number))}
      options={slots.map((slot: SlotRow) => ({
        value: String(slot.id),
        label: `${WEEKDAYS[slot.weekday]} ${slot.startTime}–${slot.endTime}`,
        hint: slot.venue?.name ?? 'Gymnase inconnu'
      }))}
    />
  </FormField>
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

  <!--
    Un `<select>` natif ouvre la roulette du système : au doigt, on y vise un gymnase
    dans une bande de trente pixels. La rangée mène à un écran de choix où chaque
    gymnase a sa ligne de 44 points.
  -->
  <FormField id="op-venue" label="Gymnase">
    <ChoiceField
      id="op-venue"
      label="Gymnase"
      value={venueId}
      onChange={(v) => (venueId = v)}
      options={venues.map((venue: VenueRow) => ({ value: String(venue.id), label: venue.name }))}
    />
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

<!--
  « Revenir » et non « Annuler » pour le renoncement : le pied porterait sinon
  « Annuler » — renoncer — à côté d'« Annuler la séance » — confirmer. Le même mot
  pour deux sens opposés, sur les deux boutons d'un même formulaire.
-->
<FormSheet
  bind:open={annulationOuverte}
  title="Annuler la séance"
  description={seanceAAnnuler
    ? `${jourCourt(seanceAAnnuler.date)} · ${seanceAAnnuler.startTime}–${seanceAAnnuler.endTime}`
    : ''}
  icon={Ban}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Annuler la séance"
  submittingLabel="Annulation…"
  cancelLabel="Revenir"
  onSubmit={cancel}
>
  <FormField
    id="op-cancel-reason"
    label="Motif"
    hint="Les adhérents déjà inscrits liront ce motif. Dites ce qui les concerne : gymnase fermé, créneau déplacé."
  >
    <Textarea
      id="op-cancel-reason"
      bind:value={motif}
      rows={3}
      placeholder="Gymnase réquisitionné pour le tournoi départemental"
      maxlength={500}
    />
  </FormField>
</FormSheet>

{#snippet criteres()}
  <SwitchField
    id="filter-a-pourvoir"
    label="Seulement les séances à pourvoir"
    hint="Celles qui ont franchi leur seuil de joueurs sans qu'un ouvreur se soit proposé."
    checked={onlyToStaff}
    onChange={(v) => (onlyToStaff = v)}
  />
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Une séance « à pourvoir » a de quoi ouvrir, mais personne pour ouvrir."
  resultCount={filtered.length}
  itemName="séance"
  onReset={() => (onlyToStaff = false)}
>
  {@render criteres()}
</FilterSheet>
