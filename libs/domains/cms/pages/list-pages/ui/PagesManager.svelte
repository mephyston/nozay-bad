<script lang="ts">
  import { Plus, FilePlus } from '@lucide/svelte';
  import { websiteOrigin } from '../../../media/media-url';
  import {
    Button,
    Input,
    Badge,
    Table,
    ChoiceField,
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
    softNavigate,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import PagesList from './PagesList.svelte';
  import PageMetaFields from '../../save-page-blocks/ui/PageMetaFields.svelte';
  import {
    dateFr,
    gestesDePage,
    pagesFiltrees,
    signalementsDePage,
    STATUTS_DE_PAGE,
    type StatutDePage
  } from './pages-row-model';

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
    onOpen,
    endpoint = '/admin/api/cms/pages'
  } = $props<{
    pages: PageRow[];
    canWrite?: boolean;
    canDelete?: boolean;
    /** Ouvre l'éditeur par-dessus la liste. Absent, la liste y navigue. */
    onOpen?: (id: number) => void;
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let title = $state('');
  let slug = $state('');
  let template = $state<'default' | 'home' | 'landing'>('default');
  let seoTitle = $state('');
  let seoDescription = $state('');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  let statut = $state<StatutDePage>('tous');
  let filtresOuverts = $state(false);

  const filteredPages = $derived(pagesFiltrees(pages as PageRow[], { recherche: searchTerm, statut }));

  const droits = $derived({ canWrite, canDelete });

  /* Les gestes, dans le vocabulaire du modèle : le menu du tableau et le balayage de la
     liste les rendent tous deux, à partir d'une seule déclaration. */
  const gestes = {
    /* Ouvrir en tiroir quand l'écran hôte sait le faire ; sinon changer d'écran, ce
       qui garde l'adresse propre d'une page atteignable et partageable. */
    onEdit: (page: PageRow) =>
      onOpen ? onOpen(page.id) : softNavigate(`/admin/website/pages/${page.id}`),
    /* L'adresse d'une page est relative au *site public*. L'ouvrir telle quelle la
       résolvait sur le domaine de l'administration, où le contrôle d'accès par page
       refuse tout chemin non déclaré : « Voir sur le site » répondait « Accès refusé ». */
    onOpenSite: (page: PageRow) => window.open(`${websiteOrigin}${page.path}`, '_blank', 'noopener'),
    onDelete: (page: PageRow) => remove(page)
  };

  /*
    Créer descend dans la barre du bas. Le bouton vivait en haut d'une barre d'outils
    qui défile avec la liste.
  */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'nouvelle', label: 'Nouvelle page', icon: FilePlus, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouvelle page' });
  });

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

  /** Une création repart toujours vierge : les valeurs d'une page abandonnée ne doivent
      pas se retrouver sur la suivante. */
  function reinitialiser() {
    title = '';
    slug = '';
    template = 'default';
    seoTitle = '';
    seoDescription = '';
  }

  function openAddForm() {
    reinitialiser();
    errorMsg = '';
    showFormSheet = true;
  }

  async function create(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    await submitForm({
      validate: () => (title.trim() ? null : 'Le titre de la page est obligatoire.'),
      submit: () =>
        post(
          {
            action: 'create',
            title: title.trim(),
            /* Les facultatifs ne partent que renseignés : absente, l'adresse se
               déduit du titre côté serveur. */
            slug: slug.trim() || undefined,
            template,
            seoTitle: seoTitle.trim() || undefined,
            seoDescription: seoDescription.trim() || undefined
          },
          'La création a échoué.'
        ),
      close: () => {
        reinitialiser();
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
  mobileSpacing="list"
  emptyTitle="Aucune page"
  emptyDescription={searchTerm.trim() || statut !== 'tous'
    ? 'Aucune page ne correspond à ces critères.'
    : 'Créez la première page du site.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une page..."
      dockSearch
      hasFilters={true}
      filtersActive={statut !== 'tous'}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={statut === 'tous'
        ? []
        : [
            {
              id: 'statut',
              label: STATUTS_DE_PAGE.find((o) => o.value === statut)?.label ?? '',
              onRemove: () => (statut = 'tous')
            }
          ]}
    >
      {#snippet filters()}
        {@render criteres()}
      {/snippet}
      {#snippet actions()}
        <!-- Sur téléphone, ce geste vit dans la barre du bas. -->
        {#if canWrite}
          <Button onclick={openAddForm} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouvelle page</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <PagesList
      pages={filteredPages}
      {droits}
      {...gestes}
      emptyTitle="Aucune page"
      emptyDescription={searchTerm.trim() || statut !== 'tous'
        ? 'Aucune page ne correspond à ces critères.'
        : 'Créez la première page du site.'}
    />
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
        <!-- Les mêmes pastilles que la liste au doigt : « En ligne » est le cas
             courant et ne s'annonce pas. -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each signalementsDePage(page) as pastille (pastille.label)}
            <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
          {/each}
        </div>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{dateFr(page.updatedAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        {@const actions = gestesDePage(page, droits, gestes)}
        {#if actions.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems {actions} item={page} />
          </DataTableRowActions>
        {/if}
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
  <!--
    Les mêmes champs qu'aux réglages d'une page, par la même déclaration : on créait
    une page sans pouvoir lui donner son adresse, puis on rouvrait ses réglages pour
    le faire. Deux markups auraient de toute façon fini par diverger.
  -->
  <PageMetaFields
    mode="creation"
    bind:titre={title}
    bind:adresse={slug}
    bind:role={template}
    bind:titreMoteurs={seoTitle}
    bind:descriptionMoteurs={seoDescription}
  />
</FormSheet>

<!-- Les critères se posent derrière la loupe, jamais ailleurs. -->
{#snippet criteres()}
  <FormField id="filter-statut-page" label="Statut">
    <ChoiceField
      id="filter-statut-page"
      label="Statut"
      value={statut}
      onChange={(v) => (statut = v as StatutDePage)}
      options={STATUTS_DE_PAGE}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Un brouillon reste enregistré : il ne paraît simplement pas sur le site."
  resultCount={filteredPages.length}
  itemName="page"
  onReset={() => (statut = 'tous')}
>
  {@render criteres()}
</FilterSheet>
