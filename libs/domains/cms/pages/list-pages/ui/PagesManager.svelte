<script lang="ts">
  import { Plus, Edit, Trash2, ExternalLink } from '@lucide/svelte';
  import { websiteOrigin } from '../../../media/media-url';
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
    softNavigate,
    uiConfirm,
    flashAndReload,
    uiAlert
  } from '@nba/ui';

  interface PageRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    updatedAt: number | string;
  }

  let {
    pages = [],
    canWrite = false,
    canDelete = false,
    endpoint = '/admin/api/cms/pages'
  } = $props<{
    pages: PageRow[];
    canWrite?: boolean;
    canDelete?: boolean;
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let title = $state('');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
  const when = (v: number | string | null) =>
    v ? formatter.format(new Date(typeof v === 'number' ? v * 1000 : v)) : '—';

  const filteredPages = $derived(
    pages.filter((row: PageRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return row.title.toLowerCase().includes(term) || row.path.toLowerCase().includes(term);
    })
  );

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
    title = '';
    errorMsg = '';
    showFormSheet = true;
  }

  async function create(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    await submitForm({
      validate: () => (title.trim() ? null : 'Le titre de la page est obligatoire.'),
      submit: () => post({ action: 'create', title: title.trim() }, 'La création a échoué.'),
      close: () => {
        title = '';
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }

  async function remove(row: PageRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: `L'adresse ${row.path} ne répondra plus. Pensez à créer une redirection si la page était en ligne.`,
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Page supprimée.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<DataTable
  data={filteredPages}
  emptyTitle="Aucune page"
  emptyDescription={searchTerm.trim()
    ? 'Aucune page ne correspond à votre recherche.'
    : 'Créez la première page du site.'}
>
  {#snippet toolbar()}
    <DataTableToolbar bind:searchValue={searchTerm} searchPlaceholder="Rechercher une page..." hasFilters={false}>
      {#snippet actions()}
        {#if canWrite}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvelle page</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filteredPages as row (row.id)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <a href={`/admin/website/pages/${row.id}`} class="text-sm font-bold text-foreground hover:underline">
                {row.title}
              </a>
              <code class="mt-1 block truncate text-xs text-muted-foreground">{row.path}</code>
            </div>
            <div class="shrink-0 text-right">
              <Badge variant={row.status === 'published' ? 'primary-soft' : 'outline'} size="xs">
                {row.status === 'published' ? 'En ligne' : 'Brouillon'}
              </Badge>
              <span class="mt-1 block text-xs text-muted-foreground">{when(row.updatedAt)}</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
            <Button
              variant="outline"
              size="sm"
              href={`/admin/website/pages/${row.id}`}
              class="h-8 flex-1 gap-1.5 text-xs font-semibold"
            >
              <Edit class="h-3.5 w-3.5" />
              <span>Modifier</span>
            </Button>
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
        </Card.Content>
      </Card.Root>
    {/each}
  {/snippet}

  {#snippet header()}
    <Table.Head>Titre</Table.Head>
    <Table.Head>Adresse</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head>Modifiée le</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(page)}
    <Table.Row>
      <Table.Cell class="font-medium">
        <a href={`/admin/website/pages/${page.id}`} class="text-foreground hover:underline">{page.title}</a>
      </Table.Cell>
      <Table.Cell>
        <code class="text-xs text-muted-foreground">{page.path}</code>
      </Table.Cell>
      <Table.Cell>
        <Badge variant={page.status === 'published' ? 'primary-soft' : 'outline'}>
          {page.status === 'published' ? 'En ligne' : 'Brouillon'}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{when(page.updatedAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <DropdownMenu.Item onclick={() => softNavigate(`/admin/website/pages/${page.id}`)} class="cursor-pointer">
            <Edit class="mr-2 h-3.5 w-3.5" />
            Modifier
          </DropdownMenu.Item>
          {#if page.status === 'published'}
            <!-- L'adresse d'une page est relative au *site public*. L'ouvrir telle
                 quelle la résolvait sur le domaine de l'administration, où le contrôle
                 d'accès par page refuse tout chemin non déclaré : « Voir sur le site »
                 répondait « Accès refusé ». Le cas se voyait surtout pour une page hors
                 menu, cette entrée étant alors le seul chemin pour l'atteindre. -->
            <DropdownMenu.Item
              onclick={() => window.open(`${websiteOrigin}${page.path}`, '_blank', 'noopener')}
              class="cursor-pointer"
            >
              <ExternalLink class="mr-2 h-3.5 w-3.5" />
              Voir sur le site
            </DropdownMenu.Item>
          {/if}
          {#if canDelete}
            <DropdownMenu.Item
              onclick={() => remove(page)}
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
  title="Nouvelle page"
  description="La page est créée en brouillon : elle n'apparaît sur le site qu'une fois publiée."
  icon={Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Créer"
  submittingLabel="Création…"
  onSubmit={create}
>
  <FormField id="page-title" label="Titre de la page">
    <Input id="page-title" bind:value={title} placeholder="Présentation" />
  </FormField>
</FormSheet>
