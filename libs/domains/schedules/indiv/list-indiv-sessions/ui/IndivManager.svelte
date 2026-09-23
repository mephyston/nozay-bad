<script lang="ts">
  import { Plus, Edit, Ban, Users, RotateCcw, CalendarPlus } from '@lucide/svelte';
  import {
    Button,
    Badge,
    Table,
    Textarea,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FilterSheet,
    FormField,
    FormSheet,
    SwitchField,
    dockDePage,
    jourCourt,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import IndivSessionForm from './IndivSessionForm.svelte';
  import IndivGenerateForm from './IndivGenerateForm.svelte';
  import IndivSessionsList from './IndivSessionsList.svelte';
  import { etatDeSoiree, gestesDeSoiree, resteAAnnoncer, type SoireeLike } from './indiv-row-model';

  /**
   * Les soirées d'indiv, vues de l'entraîneur.
   *
   * Une ligne par soirée : combien demandent, combien sont retenus, et où en est
   * l'annonce. Le choix lui-même se fait sur un écran à part — c'est là qu'il faut de la
   * place pour lire l'âge, le classement et l'historique de chacun.
   */

  export interface SessionRow {
    id: number; date: string; startTime: string; endTime: string;
    venueId: number; venue: { name: string } | null;
    slotCount: number; slotMinutes: number; capacityPerSlot: number;
    status: 'open' | 'announced' | 'cancelled';
    label: string | null; notes: string | null; cancelledReason: string | null;
    requestCount: number; selectedCount: number;
  }
  interface VenueRow { id: number; name: string }
  interface SlotRow { id: number; weekday: number; startTime: string; endTime: string; label: string | null; venue?: { name: string } | null }

  let {
    sessions = [], venues = [], slots = [],
    canWrite = false,
    endpoint = '/admin/api/schedules/indiv',
    selectionHref = (id: number) => `/admin/entrainement/indiv/selection?id=${id}`
  } = $props<{
    sessions: SessionRow[]; venues: VenueRow[]; slots?: SlotRow[];
    canWrite?: boolean;
    /** Relais du domaine, destination nommée des écritures. */
    endpoint?: string;
    selectionHref?: (id: number) => string;
  }>();

  let searchTerm = $state('');
  let onlyToAnnounce = $state(false);
  let showForm = $state(false);
  let editing = $state<SessionRow | null>(null);
  let showGenerate = $state(false);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = $derived(
    sessions.filter((row: SessionRow) => {
      if (onlyToAnnounce && !resteAAnnoncer(row as SoireeLike, today)) return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return row.date.includes(term) || (row.venue?.name ?? '').toLowerCase().includes(term) || (row.label ?? '').toLowerCase().includes(term);
    })
  );

  async function post(body: unknown, fallback: string) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  /**
   * Annuler : un formulaire, et non plus `window.prompt`.
   *
   * La boîte native n'a ni le style de l'application, ni de place pour dire à qui ce
   * motif s'adresse, et sur un téléphone elle s'ouvre au milieu de l'écran — loin du
   * pouce — en bloquant tout le reste. Or les candidats vont lire ce texte.
   */
  let annulationOuverte = $state(false);
  let soireeAAnnuler = $state<SessionRow | null>(null);
  let motif = $state('');
  let busy = $state(false);
  let errorMsg = $state('');

  function openCancelForm(row: SessionRow) {
    soireeAAnnuler = row;
    motif = row.cancelledReason ?? '';
    errorMsg = '';
    annulationOuverte = true;
  }

  async function cancel(event: Event) {
    event.preventDefault();
    const row = soireeAAnnuler;
    if (!row) return;
    errorMsg = '';
    busy = true;

    await submitForm({
      // Le serveur refuse un motif vide ; autant le dire avant l'aller-retour.
      validate: () => (motif.trim() ? null : 'Dites pourquoi la soirée est annulée.'),
      submit: () =>
        post(
          { action: 'update', id: row.id, status: 'cancelled', cancelledReason: motif.trim() },
          "L'annulation a échoué."
        ),
      close: () => {
        annulationOuverte = false;
        soireeAAnnuler = null;
        motif = '';
      },
      success: 'Soirée annulée.',
      onError: (message) => { errorMsg = message; }
    });

    busy = false;
  }

  async function reopen(row: SessionRow) {
    const confirmed = await uiConfirm({
      title: 'Rouvrir cette soirée ?',
      description: 'Les candidatures redeviennent possibles et le motif disparaît. Les retenus restent marqués, à vous de ré-annoncer.',
      confirmLabel: 'Rouvrir'
    });
    if (!confirmed) return;
    try {
      await post({ action: 'update', id: row.id, status: 'open' }, 'La réouverture a échoué.');
      flashAndReload('Soirée rouverte.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La réouverture a échoué.');
    }
  }

  /*
    Créer et programmer descendent dans la barre du bas : ils vivaient en haut d'une
    barre d'outils qui défile avec la liste, donc hors de vue dès la troisième soirée.
  */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [];
    if (venues.length > 0) {
      actions.push({ id: 'nouvelle', label: 'Nouvelle soirée', icon: Plus, run: () => { editing = null; showForm = true; } });
    }
    if (slots.length > 0) {
      actions.push({ id: 'programmer', label: 'Programmer les soirées', icon: CalendarPlus, run: () => (showGenerate = true) });
    }
    if (actions.length === 0) return;
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Ajouter des soirées' });
  });

  let filtresOuverts = $state(false);


</script>

{#if canWrite && venues.length === 0}
  <p class="text-muted-foreground mb-6 text-sm">Enregistrez d'abord un gymnase : une soirée s'y rattache obligatoirement.</p>
{/if}

<DataTable
  data={filtered}
  mobileSpacing="list"
  emptyTitle="Aucune soirée"
  emptyDescription={searchTerm.trim() || onlyToAnnounce ? 'Aucune soirée ne correspond à votre recherche.' : 'Programmez les soirées d’indiv depuis les créneaux marqués « séances individuelles » dans les horaires.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une soirée..."
      dockSearch
      hasFilters={true}
      filtersActive={onlyToAnnounce}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={onlyToAnnounce
        ? [{ id: 'annoncer', label: 'À annoncer', onRemove: () => (onlyToAnnounce = false) }]
        : []}
    >
      {#snippet filters()}
        {@render criteres()}
      {/snippet}
      {#snippet actions()}
        <!-- Sur téléphone, ces deux gestes vivent dans la barre du bas. -->
        {#if canWrite && slots.length > 0}
          <Button variant="outline" onclick={() => (showGenerate = true)} class="hidden h-9 shrink-0 gap-1.5 font-semibold md:flex">
            <CalendarPlus class="h-4 w-4" />
            <span>Programmer les soirées</span>
          </Button>
        {/if}
        {#if canWrite && venues.length > 0}
          <Button onclick={() => { editing = null; showForm = true; }} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouvelle soirée</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <IndivSessionsList
      sessions={filtered}
      droits={{ canWrite }}
      {selectionHref}
      aujourdhui={today}
      emptyTitle="Aucune soirée"
      emptyDescription={searchTerm.trim() || onlyToAnnounce
        ? 'Aucune soirée ne correspond à ces critères.'
        : 'Programmez les soirées d’indiv depuis les créneaux marqués « séances individuelles » dans les horaires.'}
      onEdit={(x) => { editing = x as SessionRow; showForm = true; }}
      onCancel={(x) => openCancelForm(x as SessionRow)}
      onReopen={(x) => void reopen(x as SessionRow)}
    />
  {/snippet}

  {#snippet header()}
    <Table.Head>Date</Table.Head>
    <Table.Head>Horaire</Table.Head>
    <Table.Head>Gymnase</Table.Head>
    <Table.Head>Créneaux</Table.Head>
    <Table.Head>Candidats</Table.Head>
    <Table.Head>État</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(session)}
    {@const status = etatDeSoiree(session as SoireeLike, today)}
    <Table.Row class={session.status === 'cancelled' ? 'opacity-60' : ''}>
      <Table.Cell class="font-medium tabular-nums">{session.date}</Table.Cell>
      <Table.Cell class="tabular-nums">{session.startTime}–{session.endTime}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{session.venue?.name ?? '—'}</Table.Cell>
      <Table.Cell class="tabular-nums">{session.slotCount} × {session.capacityPerSlot} places</Table.Cell>
      <Table.Cell class="tabular-nums">
        <span class="text-foreground">{session.requestCount}</span>
        <span class="block text-xs text-muted-foreground">{session.selectedCount} retenu{session.selectedCount > 1 ? 's' : ''}</span>
      </Table.Cell>
      <Table.Cell><Badge variant={status.variante}>{status.texte}</Badge></Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <DropdownMenu.Item onclick={() => (window.location.href = selectionHref(session.id))} class="cursor-pointer">
            <Users class="mr-2 h-3.5 w-3.5" />Candidats et sélection
          </DropdownMenu.Item>
          <!--
            Le menu du tableau et le balayage de la liste sont nourris par la **même**
            déclaration : c'est ce qui empêche leurs libellés de diverger.
          -->
          {#each gestesDeSoiree(session as SoireeLike, { canWrite }, { onEdit: (x) => { editing = x as SessionRow; showForm = true; }, onCancel: (x) => openCancelForm(x as SessionRow), onReopen: (x) => void reopen(x as SessionRow) }) as action (action.id)}
            {@const Icone = action.icon}
            <DropdownMenu.Item
              onclick={() => action.run(session as SoireeLike)}
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

<IndivSessionForm bind:open={showForm} session={editing} {venues} {endpoint} />
<IndivGenerateForm bind:open={showGenerate} {slots} {endpoint} />

<!--
  « Revenir » et non « Annuler » pour le renoncement : le pied porterait sinon
  « Annuler » — renoncer — à côté d'« Annuler la soirée » — confirmer.
-->
<FormSheet
  bind:open={annulationOuverte}
  title="Annuler la soirée"
  description={soireeAAnnuler
    ? `${jourCourt(soireeAAnnuler.date)} · ${soireeAAnnuler.startTime}–${soireeAAnnuler.endTime}`
    : ''}
  icon={Ban}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Annuler la soirée"
  submittingLabel="Annulation…"
  cancelLabel="Revenir"
  onSubmit={cancel}
>
  <FormField
    id="indiv-cancel-reason"
    label="Motif"
    hint="Les candidats liront ce motif. Dites ce qui les concerne : gymnase fermé, entraîneur absent."
  >
    <Textarea
      id="indiv-cancel-reason"
      bind:value={motif}
      rows={3}
      placeholder="Gymnase réquisitionné pour le tournoi départemental"
      maxlength={500}
    />
  </FormField>
</FormSheet>

{#snippet criteres()}
  <SwitchField
    id="filter-a-annoncer"
    label="Seulement les soirées à annoncer"
    hint="Celles dont les candidatures sont ouvertes et dont la date n’est pas passée."
    checked={onlyToAnnounce}
    onChange={(v) => (onlyToAnnounce = v)}
  />
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Une soirée « à annoncer » attend que vous préveniez les retenus."
  resultCount={filtered.length}
  itemName="soirée"
  onReset={() => (onlyToAnnounce = false)}
>
  {@render criteres()}
</FilterSheet>
