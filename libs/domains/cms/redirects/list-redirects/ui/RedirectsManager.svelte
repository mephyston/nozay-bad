<script lang="ts">
  import { Plus, Edit, Trash2, Signpost } from '@lucide/svelte';
  import {
    Button,
    Input,
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
    uiConfirm,
    flashAndReload,
    uiAlert
  } from '@nba/ui';

  interface RedirectRow {
    id: number;
    fromPath: string;
    toPath: string | null;
    statusCode: number;
    hitCount: number;
    note: string | null;
    createdAt: number | string;
  }

  let {
    redirects = [],
    canWrite = false,
    endpoint = '/admin/api/cms/redirects'
  } = $props<{
    redirects: RedirectRow[];
    canWrite?: boolean;
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');
  let page = $state(1);
  // Adresses dépliées sur mobile : le survol n'existe pas au doigt, on déplie au toucher.
  let expanded = $state<Set<number>>(new Set());

  const PAGE_SIZE = 20;

  // null = création ; sinon la ligne en cours de modification, dont la source est figée.
  let editingId = $state<number | null>(null);
  let fromPath = $state('');
  let kind = $state<'redirect' | 'gone'>('redirect');
  let toPath = $state('');
  let note = $state('');

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
  const when = (v: number | string | null) =>
    v ? formatter.format(new Date(typeof v === 'number' ? v * 1000 : v)) : '—';

  const visits = (count: number) =>
    count === 0 ? 'jamais empruntée' : `${count} visite${count > 1 ? 's' : ''}`;

  const filteredRedirects = $derived(
    redirects.filter((row: RedirectRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        row.fromPath.toLowerCase().includes(term) ||
        (row.toPath ?? '').toLowerCase().includes(term) ||
        (row.note ?? '').toLowerCase().includes(term)
      );
    })
  );

  // Une recherche redéfinit la liste : rester sur une page lointaine afficherait du vide.
  $effect(() => {
    searchTerm;
    page = 1;
  });

  const pagination = $derived({
    page,
    total: filteredRedirects.length,
    totalPages: Math.max(1, Math.ceil(filteredRedirects.length / PAGE_SIZE))
  });

  const pagedRedirects = $derived(
    filteredRedirects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  );

  function toggleExpanded(id: number) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  async function post(body: unknown, fallback: string) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try {
        const parsed = (await response.json()) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch { /* message générique */ }
      throw new Error(message);
    }
  }

  function openAddForm() {
    editingId = null;
    fromPath = '';
    kind = 'redirect';
    toPath = '';
    note = '';
    errorMsg = '';
    showFormSheet = true;
  }

  function openEditForm(row: RedirectRow) {
    editingId = row.id;
    fromPath = row.fromPath;
    kind = row.toPath === null ? 'gone' : 'redirect';
    toPath = row.toPath ?? '';
    note = row.note ?? '';
    errorMsg = '';
    showFormSheet = true;
  }

  function validate(): string | null {
    if (editingId === null) {
      const source = fromPath.trim();
      if (!source) return "L'ancienne adresse est obligatoire.";
      if (!source.startsWith('/')) return "L'ancienne adresse doit commencer par « / ».";
    }
    if (kind === 'redirect') {
      const target = toPath.trim();
      if (!target) return "L'adresse cible est obligatoire pour une redirection.";
      if (!target.startsWith('/')) return "L'adresse cible doit commencer par « / ».";
    }
    return null;
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const target = kind === 'gone' ? null : toPath.trim();
    const body =
      editingId === null
        ? { action: 'create', fromPath: fromPath.trim(), toPath: target, note: note.trim() || null }
        : { action: 'update', id: editingId, toPath: target, note: note.trim() || null };

    await submitForm({
      validate,
      submit: () => post(body, "L'enregistrement a échoué."),
      close: () => {
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }

  async function remove(row: RedirectRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer la redirection de « ${row.fromPath} » ?`,
      description:
        row.hitCount > 0
          ? `Cette adresse a encore été empruntée (${visits(row.hitCount)}). Sans redirection, elle ne répondra plus du tout.`
          : "L'ancienne adresse ne répondra plus du tout.",
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Redirection supprimée.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<DataTable
  data={pagedRedirects}
  {pagination}
  onPageChange={(p: number) => (page = p)}
  itemName="redirection(s)"
  emptyTitle="Aucune redirection"
  emptyDescription={searchTerm.trim()
    ? 'Aucune redirection ne correspond à votre recherche.'
    : 'Les redirections apparaissent au renommage des pages publiées, ou se créent ici.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une adresse..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if canWrite}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvelle redirection</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each pagedRedirects as row (row.id)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <!-- Pas de survol au doigt : toucher l'adresse la déplie en entier. -->
            <button
              type="button"
              class="min-w-0 text-left"
              aria-expanded={expanded.has(row.id)}
              aria-label="Afficher l'adresse complète"
              onclick={() => toggleExpanded(row.id)}
            >
              <code
                class={`block text-sm font-bold text-foreground ${expanded.has(row.id) ? 'break-all' : 'truncate'}`}
              >
                {row.fromPath}
              </code>
              {#if row.toPath === null}
                <Badge variant="destructive" size="xs" class="mt-1">410 — supprimée</Badge>
              {:else}
                <code
                  class={`mt-1 block text-xs text-muted-foreground ${expanded.has(row.id) ? 'break-all' : 'truncate'}`}
                >
                  → {row.toPath}
                </code>
              {/if}
            </button>
            <div class="shrink-0 text-right">
              <Badge variant={row.toPath === null ? 'destructive' : 'outline'} size="xs">
                {row.statusCode}
              </Badge>
              <span class="mt-1 block text-xs text-muted-foreground">{visits(row.hitCount)}</span>
            </div>
          </div>

          {#if row.note}
            <p class="text-xs text-muted-foreground">{row.note}</p>
          {/if}

          {#if canWrite}
            <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
              <Button
                variant="outline"
                size="sm"
                onclick={() => openEditForm(row)}
                class="h-8 flex-1 gap-1.5 text-xs font-semibold"
              >
                <Edit class="h-3.5 w-3.5" />
                <span>Modifier</span>
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
    <Table.Head>Ancienne adresse</Table.Head>
    <Table.Head>Cible</Table.Head>
    <Table.Head>Type</Table.Head>
    <Table.Head>Visites</Table.Head>
    <Table.Head>Note</Table.Head>
    <Table.Head>Créée le</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(redirect)}
    <Table.Row>
      <Table.Cell class="max-w-[14rem]">
        <code class="block truncate text-xs text-foreground" title={redirect.fromPath}>
          {redirect.fromPath}
        </code>
      </Table.Cell>
      <Table.Cell class="max-w-[14rem]">
        {#if redirect.toPath === null}
          <span class="text-xs text-muted-foreground">—</span>
        {:else}
          <code class="block truncate text-xs text-muted-foreground" title={redirect.toPath}>
            {redirect.toPath}
          </code>
        {/if}
      </Table.Cell>
      <Table.Cell>
        <Badge variant={redirect.toPath === null ? 'destructive' : 'outline'} size="xs">
          {redirect.toPath === null ? '410 — supprimée' : '301'}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{visits(redirect.hitCount)}</Table.Cell>
      <Table.Cell class="max-w-[16rem]">
        {#if redirect.note}
          <span class="block truncate text-xs text-muted-foreground" title={redirect.note}>
            {redirect.note}
          </span>
        {:else}
          <span class="text-xs text-muted-foreground">—</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{when(redirect.createdAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        {#if canWrite}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <DropdownMenu.Item onclick={() => openEditForm(redirect)} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />
              Modifier
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => remove(redirect)}
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

<!-- Les 301 sont comptées à chaque passage ; les 410, mises en cache un quart d'heure
     par le site public, sont sous-comptées. Le dire évite de purger une adresse « jamais
     empruntée » qui l'est en réalité. -->
<p class="text-xs text-muted-foreground">
  Le compteur des adresses supprimées (410) est en dessous de la réalité : le site public garde
  leur réponse en cache un quart d'heure, et ces passages-là ne sont pas comptés.
</p>

<FormSheet
  bind:open={showFormSheet}
  title={editingId === null ? 'Nouvelle redirection' : 'Modifier la redirection'}
  description={editingId === null
    ? "L'ancienne adresse enverra les visiteurs et les moteurs vers sa cible."
    : "L'ancienne adresse reste la même : seuls sa destination et son commentaire changent."}
  icon={editingId === null ? Plus : Signpost}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Enregistrer"
  submittingLabel="Enregistrement…"
  onSubmit={save}
>
  {#if editingId === null}
    <FormField id="redirect-from" label="Ancienne adresse">
      <Input id="redirect-from" bind:value={fromPath} placeholder="/ancienne-page/" />
    </FormField>
  {:else}
    <FormField id="redirect-from" label="Ancienne adresse">
      <code class="block rounded-md border border-border bg-muted px-3 py-2 text-sm">{fromPath}</code>
    </FormField>
  {/if}

  <FormField id="redirect-kind" label="Que répond cette adresse ?">
    <div class="space-y-2">
      <label class="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="redirect-kind"
          value="redirect"
          checked={kind === 'redirect'}
          onchange={() => (kind = 'redirect')}
          class="mt-1"
        />
        <span>
          <span class="font-medium">Redirection (301)</span>
          <span class="text-muted-foreground block text-xs">
            Les visiteurs et les moteurs sont envoyés vers l'adresse cible.
          </span>
        </span>
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="redirect-kind"
          value="gone"
          checked={kind === 'gone'}
          onchange={() => (kind = 'gone')}
          class="mt-1"
        />
        <span>
          <span class="font-medium">Page supprimée (410)</span>
          <span class="text-muted-foreground block text-xs">
            Sans successeur : les moteurs retirent l'adresse de leur index.
          </span>
        </span>
      </label>
    </div>
  </FormField>

  {#if kind === 'redirect'}
    <FormField id="redirect-to" label="Adresse cible">
      <Input id="redirect-to" bind:value={toPath} placeholder="/nouvelle-page/" />
    </FormField>
  {/if}

  <FormField id="redirect-note" label="Note (facultative)">
    <Input id="redirect-note" bind:value={note} placeholder="Pourquoi cette redirection existe" maxlength={500} />
  </FormField>
</FormSheet>
