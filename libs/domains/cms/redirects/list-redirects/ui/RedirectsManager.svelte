<script lang="ts">
  import { Plus, Signpost } from '@lucide/svelte';
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
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import RedirectsList from './RedirectsList.svelte';
  import {
    dateFr,
    gestesDeRedirection,
    redirectionsFiltrees,
    signalementsDeRedirection,
    visites,
    NATURES,
    type NatureDeRedirection
  } from './redirects-row-model';

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
  const PAGE_SIZE = 20;

  // null = création ; sinon la ligne en cours de modification, dont la source est figée.
  let editingId = $state<number | null>(null);
  let fromPath = $state('');
  let kind = $state<'redirect' | 'gone'>('redirect');
  let toPath = $state('');
  let note = $state('');

  let nature = $state<NatureDeRedirection>('toutes');
  let filtresOuverts = $state(false);

  const filteredRedirects = $derived(
    redirectionsFiltrees(redirects as RedirectRow[], { recherche: searchTerm, nature })
  );

  /*
    Au doigt, la liste se rend par tranches ; à la souris, par pages numérotées. Les
    deux mécanismes vivent dans `DataTable`, qui n'affiche le bouton que sous `md` —
    le refaire dans la liste donnait les deux à la fois sur téléphone.
  */
  const PAR_TRANCHE = PAGE_SIZE;
  let visibles = $state(PAR_TRANCHE);

  // Une recherche redéfinit la liste : rester sur une page lointaine afficherait du
  // vide, et une tranche ouverte sur d'autres critères n'a pas de sens.
  $effect(() => {
    searchTerm;
    nature;
    page = 1;
    visibles = PAR_TRANCHE;
  });

  const visiblesAuDoigt = $derived(filteredRedirects.slice(0, visibles));

  const gestes = $derived({
    canWrite,
    onEdit: (r: RedirectRow) => openEditForm(r),
    onDelete: (r: RedirectRow) => remove(r)
  });

  /* Créer descend dans la barre du bas. */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'nouvelle', label: 'Nouvelle redirection', icon: Signpost, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouvelle redirection' });
  });

  const pagination = $derived({
    page,
    total: filteredRedirects.length,
    totalPages: Math.max(1, Math.ceil(filteredRedirects.length / PAGE_SIZE))
  });

  const pagedRedirects = $derived(
    filteredRedirects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
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
          ? `Cette adresse a encore été empruntée (${visites(row.hitCount)}). Sans redirection, elle ne répondra plus du tout.`
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
  onLoadMore={() => (visibles += PAR_TRANCHE)}
  loadedCount={Math.min(visibles, filteredRedirects.length)}
  mobileSpacing="list"
  itemName="redirection(s)"
  emptyTitle="Aucune redirection"
  emptyDescription={searchTerm.trim() || nature !== 'toutes'
    ? 'Aucune redirection ne correspond à ces critères.'
    : 'Les redirections apparaissent au renommage des pages publiées, ou se créent ici.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une adresse..."
      dockSearch
      hasFilters={true}
      filtersActive={nature !== 'toutes'}
      onOpenFilters={() => (filtresOuverts = true)}
      activeFilters={nature === 'toutes'
        ? []
        : [
            {
              id: 'nature',
              label: NATURES.find((o) => o.value === nature)?.label ?? '',
              onRemove: () => (nature = 'toutes')
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
            <span>Nouvelle redirection</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <!-- La liste reçoit la tranche visible, pas la page courante : le bouton qui pousse
         les suivantes vit dans le pied du tableau, où il ne paraît que sous `md`. Viser
         un numéro de page de huit pixels n'est pas un geste de pouce. -->
    <RedirectsList
      redirections={visiblesAuDoigt}
      {...gestes}
      emptyTitle="Aucune redirection"
      emptyDescription={searchTerm.trim() || nature !== 'toutes'
        ? 'Aucune redirection ne correspond à ces critères.'
        : 'Les redirections apparaissent au renommage des pages publiées, ou se créent ici.'}
    />
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
        <!-- Les mêmes pastilles que la liste au doigt : rediriger est le cas courant
             et ne s'annonce pas. -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each signalementsDeRedirection(redirect) as pastille (pastille.label)}
            <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
          {/each}
        </div>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{visites(redirect.hitCount)}</Table.Cell>
      <Table.Cell class="max-w-[16rem]">
        {#if redirect.note}
          <span class="block truncate text-xs text-muted-foreground" title={redirect.note}>
            {redirect.note}
          </span>
        {:else}
          <span class="text-xs text-muted-foreground">—</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{dateFr(redirect.createdAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        {@const actions = gestesDeRedirection(redirect, gestes)}
        {#if actions.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems {actions} item={redirect} />
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

  <!--
    Deux boutons radio et leurs deux paragraphes tenaient cent pixels pour un choix
    binaire, avec des cibles de 16 px. Une rangée le porte, et le menu explique chaque
    option à l'ouverture ; la conséquence du choix retenu reste sous le champ.
  -->
  <FormField
    id="redirect-kind"
    label="Que répond cette adresse ?"
    hint={kind === 'gone'
      ? "Sans successeur : les moteurs retirent l'adresse de leur index."
      : 'Les visiteurs et les moteurs sont envoyés vers l’adresse cible.'}
  >
    <ChoiceField
      id="redirect-kind"
      label="Réponse"
      value={kind}
      onChange={(v) => (kind = v as 'redirect' | 'gone')}
      options={[
        { value: 'redirect', label: 'Redirection (301)', hint: 'Vers une autre adresse' },
        { value: 'gone', label: 'Page supprimée (410)', hint: 'Sans successeur' }
      ]}
    />
  </FormField>

  {#if kind === 'redirect'}
    <FormField id="redirect-to" label="Adresse cible">
      <Input id="redirect-to" bind:value={toPath} placeholder="/nouvelle-page/" />
    </FormField>
  {/if}

  <FormField
    id="redirect-note"
    label="Note"
    hint="Facultative : pourquoi cette redirection existe."
  >
    <Input id="redirect-note" bind:value={note} placeholder="Migration WordPress" maxlength={500} />
  </FormField>
</FormSheet>

<!-- Les critères se posent derrière la loupe, jamais ailleurs. -->
{#snippet criteres()}
  <FormField id="filter-nature" label="Nature">
    <ChoiceField
      id="filter-nature"
      label="Nature"
      value={nature}
      onChange={(v) => (nature = v as NatureDeRedirection)}
      options={NATURES}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Une redirection jamais empruntée peut se retirer sans risque."
  resultCount={filteredRedirects.length}
  itemName="redirection"
  onReset={() => (nature = 'toutes')}
>
  {@render criteres()}
</FilterSheet>
