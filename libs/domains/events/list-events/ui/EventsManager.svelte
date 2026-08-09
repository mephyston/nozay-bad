<script lang="ts">
  import { Plus, Edit, Trash2, Eye, Ban } from '@lucide/svelte';
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
    submitForm,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
  import { EVENT_CATEGORY_LABELS } from '../../shared/schema';

  interface EventRow {
    id: number; title: string; startsAt: string; venueLabel: string | null;
    category: keyof typeof EVENT_CATEGORY_LABELS; status: 'draft' | 'published' | 'cancelled';
  }

  let { events = [], canWrite = false, canDelete = false } = $props<{
    events: EventRow[]; canWrite?: boolean; canDelete?: boolean;
  }>();

  let editingId = $state<number | null>(null);
  let title = $state('');
  let startsAt = $state('');
  let category = $state<keyof typeof EVENT_CATEGORY_LABELS>('competition');
  let venueLabel = $state('');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

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

  async function post(body: unknown, fallback: string) {
    const response = await fetch('', {
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
    title = '';
    startsAt = '';
    category = 'competition';
    venueLabel = '';
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
    category = row.category;
    venueLabel = row.venueLabel ?? '';
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
        if (!title.trim()) return "Le titre de l'événement est obligatoire.";
        if (!startsAt) return 'Indiquez la date et l’heure de début.';
        return null;
      },
      submit: () =>
        post(
          {
            action: id ? 'update' : 'create',
            ...(id ? { id } : {}),
            title: title.trim(),
            startsAt,
            category,
            venueLabel: venueLabel.trim() || (id ? null : undefined)
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
            </div>
            <Badge variant={STATUS[row.status].variant} size="xs">{STATUS[row.status].label}</Badge>
          </div>

          {#if canWrite || canDelete}
            <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
              {#if canWrite}
                <Button variant="outline" size="sm" onclick={() => startEdit(row)} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                  <Edit class="h-3.5 w-3.5" />
                  <span>Modifier</span>
                </Button>
                {#if row.status !== 'published'}
                  <Button variant="outline" size="sm" onclick={() => setStatus(row, 'published')} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                    <Eye class="h-3.5 w-3.5" />
                    <span>Publier</span>
                  </Button>
                {:else}
                  <Button variant="outline" size="sm" onclick={() => setStatus(row, 'cancelled')} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                    <Ban class="h-3.5 w-3.5" />
                    <span>Annuler</span>
                  </Button>
                {/if}
              {/if}
              {#if canDelete}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => remove(row)}
                  class="h-8 flex-1 gap-1.5 border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
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
    <Input id="ev-start" type="datetime-local" bind:value={startsAt} />
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
      placeholder="Halle des Sports, ou le gymnase du club adverse"
      maxlength={200}
    />
  </FormField>
</FormSheet>
