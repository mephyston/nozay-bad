<script lang="ts">
  import { Plus, Edit, Trash2, Eye, Ban, Users, Copy } from '@lucide/svelte';
  import {
    Button,
    Input,
    Select,
    Badge,
    Card,
    Table,
    Sheet,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    ErrorAlert,
    FormField,
    FormSheet,
    submitForm,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
  import { EVENT_CATEGORY_LABELS, EVENT_REGISTRATION_LABELS } from '../../shared/schema';

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

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (v: string) => formatter.format(new Date(`${v}:00`));

  const STATUS: Record<EventRow['status'], { label: string; variant: 'primary-soft' | 'outline' | 'destructive' }> = {
    published: { label: 'En ligne', variant: 'primary-soft' },
    draft: { label: 'Brouillon', variant: 'outline' },
    cancelled: { label: 'Annulé', variant: 'destructive' }
  };

  const filteredEvents = $derived(
    events.filter((row: EventRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        EVENT_CATEGORY_LABELS[row.category].toLowerCase().includes(term) ||
        (row.venueLabel ?? '').toLowerCase().includes(term)
      );
    })
  );

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
  function onStartChange(event: Event) {
    const next = (event.currentTarget as HTMLInputElement).value;

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
      success: id ? 'Événement mis à jour.' : 'Événement créé en brouillon.',
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
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
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
      toast.error("La copie a échoué. Le navigateur l'a peut-être refusée.");
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
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<DataTable
  data={filteredEvents}
  emptyTitle="Agenda vide"
  emptyDescription={searchTerm.trim()
    ? 'Aucun événement ne correspond à votre recherche.'
    : 'Ajoutez les compétitions et animations de la saison.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un événement..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if canWrite}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvel événement</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filteredEvents as row (row.id)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">{row.title}</h4>
              <p class="mt-1 text-xs text-muted-foreground">{when(row.startsAt)}</p>
              <p class="text-xs text-muted-foreground">
                {EVENT_CATEGORY_LABELS[row.category]}{#if row.venueLabel} · {row.venueLabel}{/if}
              </p>
              {#if row.registration !== 'none'}
                <p class="mt-1 text-xs text-muted-foreground">
                  Inscriptions {row.registration === 'open' ? 'ouvertes' : 'closes'} ·
                  {row.registrationCount} inscrit{row.registrationCount > 1 ? 's' : ''}
                  {#if row.attendeeCount !== row.registrationCount}
                    ({row.attendeeCount} personnes)
                  {/if}
                </p>
              {/if}
            </div>
            <Badge variant={STATUS[row.status].variant} size="xs">{STATUS[row.status].label}</Badge>
          </div>

          {#if canWrite || canDelete || canReadRegistrations}
            <!-- Jusqu'à quatre actions quand les inscriptions sont ouvertes : on autorise le passage à la ligne. -->
            <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-2">
              {#if canWrite}
                <Button variant="outline" size="sm" onclick={() => startEdit(row)} class="h-8 flex-1 basis-[40%] gap-1.5 text-xs font-semibold">
                  <Edit class="h-3.5 w-3.5" />
                  <span>Modifier</span>
                </Button>
                {#if row.status !== 'published'}
                  <Button variant="outline" size="sm" onclick={() => setStatus(row, 'published')} class="h-8 flex-1 basis-[40%] gap-1.5 text-xs font-semibold">
                    <Eye class="h-3.5 w-3.5" />
                    <span>Publier</span>
                  </Button>
                {:else}
                  <Button variant="outline" size="sm" onclick={() => setStatus(row, 'cancelled')} class="h-8 flex-1 basis-[40%] gap-1.5 text-xs font-semibold">
                    <Ban class="h-3.5 w-3.5" />
                    <span>Annuler</span>
                  </Button>
                {/if}
              {/if}
              {#if canReadRegistrations && row.registration !== 'none'}
                <Button variant="outline" size="sm" onclick={() => openRegistrations(row)} class="h-8 flex-1 basis-[40%] gap-1.5 text-xs font-semibold">
                  <Users class="h-3.5 w-3.5" />
                  <span>Inscrits</span>
                </Button>
              {/if}
              {#if canDelete}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => remove(row)}
                  class="h-8 flex-1 basis-[40%] gap-1.5 border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                  <span>Supprimer</span>
                </Button>
              {/if}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/each}
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
      <Table.Cell class="text-muted-foreground">{when(item.startsAt)}</Table.Cell>
      <Table.Cell>{EVENT_CATEGORY_LABELS[item.category]}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{item.venueLabel ?? '—'}</Table.Cell>
      <Table.Cell>
        <Badge variant={STATUS[item.status].variant}>{STATUS[item.status].label}</Badge>
      </Table.Cell>
      <Table.Cell>
        {#if item.registration === 'none'}
          <span class="text-muted-foreground">—</span>
        {:else}
          <div class="flex flex-col gap-1">
            <Badge variant={item.registration === 'open' ? 'primary-soft' : 'outline'} size="xs">
              {item.registration === 'open' ? 'Ouvertes' : 'Closes'}
            </Badge>
            <span class="text-muted-foreground text-xs">
              {item.registrationCount} inscrit{item.registrationCount > 1 ? 's' : ''}
              {#if item.attendeeCount !== item.registrationCount}
                · {item.attendeeCount} personnes
              {/if}
            </span>
          </div>
        {/if}
      </Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          {#if canWrite}
            <DropdownMenu.Item onclick={() => startEdit(item)} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />
              Modifier
            </DropdownMenu.Item>
            {#if item.status !== 'published'}
              <DropdownMenu.Item onclick={() => setStatus(item, 'published')} class="cursor-pointer">
                <Eye class="mr-2 h-3.5 w-3.5" />
                Publier
              </DropdownMenu.Item>
            {/if}
            {#if item.status === 'published'}
              <DropdownMenu.Item onclick={() => setStatus(item, 'cancelled')} class="cursor-pointer">
                <Ban class="mr-2 h-3.5 w-3.5" />
                Annuler l'événement
              </DropdownMenu.Item>
            {/if}
          {/if}
          {#if canReadRegistrations && item.registration !== 'none'}
            <DropdownMenu.Item onclick={() => openRegistrations(item)} class="cursor-pointer">
              <Users class="mr-2 h-3.5 w-3.5" />
              Voir les inscrits
            </DropdownMenu.Item>
          {/if}
          {#if canDelete}
            <DropdownMenu.Item
              onclick={() => remove(item)}
              class="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 class="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenu.Item>
          {/if}
        </DataTableRowActions>
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
    <Input id="ev-start" type="datetime-local" value={startsAt} onchange={onStartChange} />
  </FormField>

  <FormField id="ev-end" label="Fin (facultative)">
    <Input id="ev-end" type="datetime-local" bind:value={endsAt} min={startsAt} />
    <p class="text-muted-foreground mt-1 text-xs">
      À laisser vide pour un rendez-vous sans heure de fin. Déplacer le début décale la
      fin d'autant, en conservant la durée — la valeur reste modifiable avant d'enregistrer.
    </p>
  </FormField>

  <FormField id="ev-cat" label="Catégorie">
    <Select id="ev-cat" bind:value={category}>
      {#each Object.entries(EVENT_CATEGORY_LABELS) as [value, text]}
        <option {value}>{text}</option>
      {/each}
    </Select>
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
    <FormField id="ev-registration" label="Inscriptions">
      <Select id="ev-registration" bind:value={registration}>
        {#each Object.entries(EVENT_REGISTRATION_LABELS) as [value, text]}
          <option {value}>{text}</option>
        {/each}
      </Select>
      <p class="text-muted-foreground mt-1 text-xs">
        Ouvertes, les adhérents s'inscrivent depuis leur espace en indiquant s'ils
        viennent accompagnés. Closes, la liste est arrêtée : plus personne ne s'ajoute
        ni ne se retire, mais elle reste consultable ici.
      </p>
    </FormField>
  {/if}
</FormSheet>

<!--
  Panneau des inscrits : en lecture seule, donc un `Sheet` nu plutôt qu'un `FormSheet`
  détourné — rien à soumettre ici, et un bouton « Enregistrer » sans effet serait un
  piège.
-->
<Sheet.Root bind:open={showRegistrations}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Users class="h-5 w-5 text-primary" />
        Inscrits
      </Sheet.Title>
      <Sheet.Description>
        {registrationsOf?.title ?? ''}
      </Sheet.Description>
    </Sheet.Header>

    <div class="space-y-4 px-4 py-4">
      {#if loadingRegistrations}
        <p class="text-muted-foreground text-sm">Chargement…</p>
      {:else if registrationsError}
        <ErrorAlert message={registrationsError} />
      {:else if registrations.length === 0}
        <p class="text-muted-foreground text-sm">Personne ne s'est encore inscrit.</p>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Nom</Table.Head>
              <Table.Head>Prénom</Table.Head>
              <Table.Head class="text-right">Accompagnants</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each registrations as person (person.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{person.lastName}</Table.Cell>
                <Table.Cell>{person.firstName}</Table.Cell>
                <Table.Cell class="text-right">{person.guests > 0 ? person.guests : '—'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>

        <div class="border-border flex items-center justify-between gap-3 border-t pt-3">
          <p class="text-sm font-medium">
            {registrationTotals.members} inscrit{registrationTotals.members > 1 ? 's' : ''},
            <span class="text-primary">
              {registrationTotals.members + registrationTotals.guests} personnes
            </span>
          </p>
          <Button variant="outline" size="sm" onclick={copyRegistrations} class="h-8 gap-1.5 text-xs font-semibold">
            <Copy class="h-3.5 w-3.5" />
            <span>Copier la liste</span>
          </Button>
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
