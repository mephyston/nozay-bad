<script lang="ts">
  import { Plus, CalendarPlus, Edit } from '@lucide/svelte';
  import {
    Button,
    Input,
    Badge,
    Table,
    ChoiceField,
    DateTimeField,
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
    toast,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { EVENT_CATEGORY_LABELS, EVENT_REGISTRATION_LABELS } from '../../shared/schema';
  import EventsList from './EventsList.svelte';
  import EventRegistrationsSheet from './EventRegistrationsSheet.svelte';
  import {
    evenementsFiltres,
    gestesDEvenement,
    libelleDeCategorie,
    ligneDEvenement,
    quand,
    signalementsDEvenement,
    PERIODES_FILTRE,
    STATUTS_FILTRE,
    type PeriodeFiltre,
    type StatutFiltre
  } from './events-row-model';

  interface EventRow {
    id: number; title: string; startsAt: string; endsAt: string | null; venueLabel: string | null;
    category: keyof typeof EVENT_CATEGORY_LABELS; status: 'draft' | 'published' | 'cancelled';
    registration: 'none' | 'open' | 'closed';
    /** Adhérents inscrits, et couverts à prévoir en les comptant avec leurs accompagnants. */
    registrationCount: number;
    attendeeCount: number;
  }

  interface RegistrationRow {
    id: number; firstName: string; lastName: string; email: string; guests: number;
  }

  let {
    events = [],
    canWrite = false,
    canDelete = false,
    canReadRegistrations = false,
    endpoint = '/admin/api/events/events'
  } = $props<{
    events: EventRow[]; canWrite?: boolean; canDelete?: boolean; canReadRegistrations?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let editingId = $state<number | null>(null);
  let title = $state('');
  let startsAt = $state('');
  let endsAt = $state('');
  /**
   * Début connu avant la dernière saisie, pour faire suivre la fin.
   *
   * Sans lui, déplacer un événement d'une année laisserait sa fin sur l'ancienne date
   * et l'API refuserait l'enregistrement — refus légitime, mais que le formulaire ne
   * donnait aucun moyen de corriger tant qu'il n'exposait pas la fin.
   */
  let previousStart = '';
  let category = $state<keyof typeof EVENT_CATEGORY_LABELS>('competition');
  let venueLabel = $state('');
  let registration = $state<EventRow['registration']>('none');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  /** Panneau des inscrits : chargé à la demande, pour un événement à la fois. */
  let showRegistrations = $state(false);
  let registrationsOf = $state<EventRow | null>(null);
  let registrations = $state<RegistrationRow[]>([]);
  let registrationsError = $state('');
  let loadingRegistrations = $state(false);

  const registrationTotals = $derived({
    members: registrations.length,
    guests: registrations.reduce((total, row) => total + row.guests, 0)
  });

  let statut = $state<StatutFiltre>('tous');
  let periode = $state<PeriodeFiltre>('tous');
  let filtresOuverts = $state(false);

  const filteredEvents = $derived(
    evenementsFiltres(events as EventRow[], { recherche: searchTerm, statut, periode })
  );

  const droits = $derived({ canWrite, canDelete, canReadRegistrations });

  /* Les gestes, dans le vocabulaire du modèle : le menu du tableau et le balayage de
     la liste les rendent tous deux, à partir d'une seule déclaration. */
  const gestes = {
    onEdit: (e: EventRow) => startEdit(e),
    onSetStatus: (e: EventRow, s: EventRow['status']) => setStatus(e, s),
    onRegistrations: (e: EventRow) => openRegistrations(e),
    onDelete: (e: EventRow) => remove(e)
  };

  const critereActifs = $derived([
    ...(statut === 'tous'
      ? []
      : [
          {
            id: 'statut',
            label: STATUTS_FILTRE.find((o) => o.value === statut)?.label ?? '',
            onRemove: () => (statut = 'tous' as StatutFiltre)
          }
        ]),
    ...(periode === 'tous'
      ? []
      : [
          {
            id: 'periode',
            label: PERIODES_FILTRE.find((o) => o.value === periode)?.label ?? '',
            onRemove: () => (periode = 'tous' as PeriodeFiltre)
          }
        ])
  ]);

  /*
    Créer descend dans la barre du bas. Le bouton vivait en haut d'une barre qui défile
    avec la liste, et l'agenda charge le passé : il sortait de l'écran au deuxième mois.
  */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'nouveau', label: 'Nouvel événement', icon: CalendarPlus, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouvel événement' });
  });

  async function post<T = unknown>(body: unknown, fallback: string): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
    // La plupart des actions rechargent la page et ignorent ce retour ; la lecture des
    // inscrits, elle, en a besoin.
    return (await response.json().catch(() => ({}))) as T;
  }

  function resetForm() {
    editingId = null;
    title = '';
    startsAt = '';
    endsAt = '';
    previousStart = '';
    category = 'competition';
    venueLabel = '';
    registration = 'none';
    errorMsg = '';
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(row: EventRow) {
    editingId = row.id;
    title = row.title;
    // `startsAt` est déjà au format `YYYY-MM-DDTHH:MM`, celui qu'attend `datetime-local`.
    startsAt = row.startsAt;
    endsAt = row.endsAt ?? '';
    previousStart = row.startsAt;
    category = row.category;
    venueLabel = row.venueLabel ?? '';
    registration = row.registration ?? 'none';
    errorMsg = '';
    showFormSheet = true;
  }

  /**
   * Déplace le début, et la fin avec lui.
   *
   * La durée est conservée : reporter une soirée d'une semaine ne demande pas de
   * ressaisir son heure de fin. Le décalage est **visible avant l'enregistrement**,
   * dans le champ voisin — rien ne bouge en silence, et il reste corrigeable.
   */
  /** Déplacer le début décale la fin d'autant : la durée d'un rendez-vous ne change pas
      parce qu'on le reporte. */
  function decalerLaFin(next: string) {
    if (endsAt && previousStart && next) {
      const delta = new Date(`${next}:00`).getTime() - new Date(`${previousStart}:00`).getTime();
      const shifted = new Date(new Date(`${endsAt}:00`).getTime() + delta);
      if (!Number.isNaN(shifted.getTime())) {
        // `datetime-local` veut « YYYY-MM-DDTHH:MM » en heure locale : `toISOString`
        // basculerait en UTC et décalerait la fin d'une ou deux heures selon la saison.
        const pad = (n: number) => String(n).padStart(2, '0');
        endsAt =
          `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}` +
          `T${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`;
      }
    }

    startsAt = next;
    previousStart = next;
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const id = editingId;

    await submitForm({
      validate: () => {
        if (!title.trim()) return "Le titre de l'événement est obligatoire.";
        if (!startsAt) return 'Indiquez la date et l’heure de début.';
        // Contrôle de confort : l'API reste l'autorité, mais dire non tout de suite
        // évite un aller-retour pour une erreur visible à l'écran.
        if (endsAt && endsAt < startsAt) return 'La fin ne peut pas précéder le début.';
        return null;
      },
      submit: () =>
        post(
          {
            action: id ? 'update' : 'create',
            ...(id ? { id } : {}),
            title: title.trim(),
            startsAt,
            // `null` efface la fin à la modification ; `undefined` la laisse absente à
            // la création, dont le validateur n'accepte pas `null`. Même idiome que
            // `venueLabel` juste en dessous.
            endsAt: endsAt || (id ? null : undefined),
            category,
            venueLabel: venueLabel.trim() || (id ? null : undefined),
            // À la création, le validateur ne connaît pas ce champ : la base pose
            // « sans inscription » elle-même. On ne l'envoie donc qu'en modification.
            ...(id ? { registration } : {})
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

  async function setStatus(row: EventRow, status: EventRow['status']) {
    try {
      await post({ action: 'update', id: row.id, status }, "L'opération a échoué.");
      flashAndReload('Événement mis à jour.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  /**
   * Ouvre la liste des inscrits d'un événement.
   *
   * Le panneau s'ouvre tout de suite, avec son état de chargement : la liste arrive
   * derrière. L'inverse — attendre la réponse pour ouvrir — donne l'impression d'un
   * clic sans effet quand le réseau traîne.
   */
  async function openRegistrations(row: EventRow) {
    registrationsOf = row;
    registrations = [];
    registrationsError = '';
    loadingRegistrations = true;
    showRegistrations = true;

    try {
      const payload = await post<{ data?: { registrations?: RegistrationRow[] } }>(
        { action: 'registrations', id: row.id },
        'Impossible de charger les inscrits.'
      );
      registrations = payload.data?.registrations ?? [];
    } catch (error) {
      registrationsError =
        error instanceof Error ? error.message : 'Impossible de charger les inscrits.';
    }

    loadingRegistrations = false;
  }

  /**
   * Recopie la liste en texte, une ligne par inscrit.
   *
   * Ce que le bureau en fait ensuite ne regarde pas l'application : un message au
   * traiteur, un tableur, un mot au gymnase. Un export de fichier demanderait une route
   * de plus pour rendre le même service.
   */
  async function copyRegistrations() {
    const lines = registrations.map((row) =>
      `${row.lastName.toUpperCase()} ${row.firstName}${row.guests > 0 ? ` (+${row.guests})` : ''}`
    );
    const text = [
      registrationsOf?.title ?? '',
      ...lines,
      `Total : ${registrationTotals.members} inscrits, ${registrationTotals.members + registrationTotals.guests} personnes`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Liste copiée.');
    } catch {
      uiAlert("La copie a échoué. Le navigateur l'a peut-être refusée.");
    }
  }

  async function remove(row: EventRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: "Pour un événement qui n'aura pas lieu, préférez le statut « Annulé » : il quitte l'agenda du site, mais reste ici avec sa trace. La suppression, elle, est définitive.",
      confirmLabel: 'Supprimer', destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Événement supprimé.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<DataTable
  data={filteredEvents}
  mobileSpacing="list"
  emptyTitle="Agenda vide"
  emptyDescription={searchTerm.trim() || statut !== 'tous' || periode !== 'tous'
    ? 'Aucun événement ne correspond à ces critères.'
    : 'Ajoutez les compétitions et animations de la saison.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un événement..."
      dockSearch
      hasFilters={true}
      filtersActive={statut !== 'tous' || periode !== 'tous'}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={critereActifs}
    >
      {#snippet filters()}
        {@render criteres()}
      {/snippet}
      {#snippet actions()}
        <!-- Sur téléphone, ce geste vit dans la barre du bas. -->
        {#if canWrite}
          <Button onclick={openAddForm} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouvel événement</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <EventsList
      evenements={filteredEvents}
      {droits}
      {...gestes}
      emptyTitle="Agenda vide"
      emptyDescription={searchTerm.trim() || statut !== 'tous' || periode !== 'tous'
        ? 'Aucun événement ne correspond à ces critères.'
        : 'Ajoutez les compétitions et animations de la saison.'}
    />
  {/snippet}

  {#snippet header()}
    <Table.Head>Événement</Table.Head>
    <Table.Head>Début</Table.Head>
    <Table.Head>Catégorie</Table.Head>
    <Table.Head>Lieu</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head>Inscriptions</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(item)}
    <Table.Row>
      <Table.Cell class="font-medium">{item.title}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{quand(item.startsAt)}</Table.Cell>
      <Table.Cell>{libelleDeCategorie(item.category)}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{item.venueLabel ?? '—'}</Table.Cell>
      <Table.Cell>
        <!-- Les mêmes pastilles que la liste au doigt : un écran, un vocabulaire.
             « En ligne » est le cas courant et ne s'annonce pas. -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each signalementsDEvenement(item) as pastille (pastille.label)}
            <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
          {/each}
        </div>
      </Table.Cell>
      <Table.Cell>
        {@const l = ligneDEvenement(item)}
        {#if l.valeur === undefined}
          <span class="text-muted-foreground">—</span>
        {:else}
          <span class="text-foreground tabular-nums">{l.valeur}</span>
          <span class="text-muted-foreground text-xs"> {l.legende}</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="relative text-right">
        {@const actions = gestesDEvenement(item, droits, gestes)}
        {#if actions.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems {actions} item={item} />
          </DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<FormSheet
  bind:open={showFormSheet}
  title={editingId ? "Modifier l'événement" : 'Nouvel événement'}
  description={editingId
    ? 'L’adresse publique de la fiche ne change pas. Le statut se change depuis la liste.'
    : "L'événement est créé en brouillon : il n'apparaît sur le site qu'une fois publié."}
  icon={editingId ? Edit : Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel={editingId ? 'Enregistrer' : 'Ajouter'}
  submittingLabel="Enregistrement…"
  onSubmit={save}
>
  <FormField id="ev-title" label="Titre">
    <Input id="ev-title" bind:value={title} placeholder="Tournoi interne" maxlength={200} />
  </FormField>

  <FormField id="ev-start" label="Début">
    <DateTimeField
      id="ev-start"
      label="Début"
      type="datetime-local"
      value={startsAt}
      onChange={decalerLaFin}
    />
  </FormField>

  <FormField
    id="ev-end"
    label="Fin"
    hint="Facultative : à laisser vide pour un rendez-vous sans heure de fin. Déplacer le début décale la fin d'autant, en conservant la durée."
  >
    <DateTimeField id="ev-end" label="Fin" type="datetime-local" bind:value={endsAt} min={startsAt} />
  </FormField>

  <FormField id="ev-cat" label="Catégorie">
    <ChoiceField
      id="ev-cat"
      label="Catégorie"
      value={category}
      onChange={(v) => (category = v as typeof category)}
      options={Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
    />
  </FormField>

  <FormField id="ev-venue" label="Lieu">
    <Input
      id="ev-venue"
      bind:value={venueLabel}
      placeholder="Un gymnase du club, ou celui du club adverse"
      maxlength={200}
    />
  </FormField>

  {#if editingId}
    <FormField
      id="ev-registration"
      label="Inscriptions"
      hint="Ouvertes, les adhérents s'inscrivent depuis leur espace en indiquant s'ils viennent accompagnés. Closes, la liste est arrêtée : plus personne ne s'ajoute ni ne se retire, mais elle reste consultable ici."
    >
      <ChoiceField
        id="ev-registration"
        label="Inscriptions"
        value={registration}
        onChange={(v) => (registration = v as typeof registration)}
        options={Object.entries(EVENT_REGISTRATION_LABELS).map(([value, label]) => ({ value, label }))}
      />
    </FormField>
  {/if}
</FormSheet>

<!--
  Panneau des inscrits : en lecture seule, donc un `Sheet` nu plutôt qu'un `FormSheet`
  détourné — rien à soumettre ici, et un bouton « Enregistrer » sans effet serait un
  piège.
-->
<EventRegistrationsSheet
  bind:open={showRegistrations}
  titre={registrationsOf?.title ?? ''}
  inscrits={registrations}
  chargement={loadingRegistrations}
  erreur={registrationsError}
  onCopier={copyRegistrations}
/>

<!-- Les critères se posent derrière la loupe, jamais ailleurs. -->
{#snippet criteres()}
  <FormField id="filter-statut" label="Statut">
    <ChoiceField
      id="filter-statut"
      label="Statut"
      value={statut}
      onChange={(v) => (statut = v as StatutFiltre)}
      options={STATUTS_FILTRE}
    />
  </FormField>
  <FormField id="filter-periode" label="Dates">
    <ChoiceField
      id="filter-periode"
      label="Dates"
      value={periode}
      onChange={(v) => (periode = v as PeriodeFiltre)}
      options={PERIODES_FILTRE}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="L'agenda charge aussi le passé : la période le ramène à ce qui vient."
  resultCount={filteredEvents.length}
  itemName="événement"
  onReset={() => {
    statut = 'tous';
    periode = 'tous';
  }}
>
  {@render criteres()}
</FilterSheet>
