<script lang="ts">
  import { Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, ImagePlus, X } from '@lucide/svelte';
  import { mediaPath, mediaUrl } from '../../../media/media-url';
  import MediaPicker, { type PickableMedia } from '../../../media/list-media/ui/MediaPicker.svelte';
  import {
    Button,
    Input,
    Badge,
    Card,
    Checkbox,
    Label,
    Table,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    DropdownMenu,
    FormField,
    FormSheet,
    RichTextEditor,
    submitForm,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';

  interface PostRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    excerpt: string | null;
    bodyHtml: string;
    coverMediaId: number | null;
    categories?: { id: number; name: string }[];
    publishedAt: number | string | null;
  }

  let {
    posts = [],
    media = [],
    categories = [],
    canWrite = false,
    canDelete = false
  } = $props<{
    posts: PostRow[];
    /** Médiathèque, déjà chargée par la page : sert la couverture et l'insertion de fichiers. */
    media?: PickableMedia[];
    categories?: { id: number; name: string }[];
    canWrite?: boolean;
    canDelete?: boolean;
  }>();

  let editingId = $state<number | null>(null);
  let title = $state('');
  let excerpt = $state('');
  let bodyHtml = $state('<p></p>');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');
  let coverMediaId = $state<number | null>(null);
  let selectedCategoryIds = $state<number[]>([]);
  let coverPickerOpen = $state(false);
  let filePickerOpen = $state(false);
  let inlineImagePickerOpen = $state(false);

  const coverMedia = $derived(
    coverMediaId === null ? null : media.find((m: PickableMedia) => m.id === coverMediaId) ?? null
  );

  /**
   * Le sélecteur de fichier de l'éditeur, en promesse.
   *
   * `RichTextEditor` appartient à `@nba/ui` et ignore tout de la médiathèque : il
   * réclame un fichier et attend une réponse. C'est ici, dans le domaine, que le
   * sheet est ouvert et que la promesse est dénouée au choix de l'utilisateur.
   */
  let resolveFilePick: ((picked: { href: string; label: string } | null) => void) | null = null;

  function pickFile(): Promise<{ href: string; label: string } | null> {
    filePickerOpen = true;
    return new Promise((resolve) => {
      resolveFilePick = resolve;
    });
  }

  function onFileChosen(item: PickableMedia) {
    resolveFilePick?.({
      // `mediaPath` et non `mediaUrl` : cette adresse part dans le corps de
      // l'actualité et sera enregistrée. Elle doit rester relative.
      href: mediaPath(item.key),
      label: item.alt || item.key.split('/').pop() || 'Document'
    });
    resolveFilePick = null;
  }

  // Fermeture sans choix : la promesse doit être dénouée, sinon l'éditeur attend
  // indéfiniment et le bouton « Fichier » ne répond plus.
  $effect(() => {
    if (!filePickerOpen && resolveFilePick) {
      resolveFilePick(null);
      resolveFilePick = null;
    }
  });

  /**
   * Insertion d'une image dans le corps du texte.
   *
   * Même mécanique que le fichier : l'éditeur réclame et attend, le sheet s'ouvre ici.
   * Les deux sélecteurs sont distincts — l'un ne montre que des images, l'autre que des
   * documents — et ne peuvent donc pas se dénouer l'un l'autre.
   */
  let resolveImagePick:
    | ((picked: { src: string; alt: string; width?: number | null; height?: number | null } | null) => void)
    | null = null;

  function pickInlineImage(): Promise<{ src: string; alt: string; width?: number | null; height?: number | null } | null> {
    inlineImagePickerOpen = true;
    return new Promise((resolve) => {
      resolveImagePick = resolve;
    });
  }

  function onInlineImageChosen(item: PickableMedia) {
    resolveImagePick?.({
      src: `/media/${item.key.replace(/^media\//, '')}`,
      alt: item.alt,
      width: item.width,
      height: item.height
    });
    resolveImagePick = null;
  }

  $effect(() => {
    if (!inlineImagePickerOpen && resolveImagePick) {
      resolveImagePick(null);
      resolveImagePick = null;
    }
  });

  function toggleCategory(id: number, checked: boolean) {
    selectedCategoryIds = checked
      ? [...selectedCategoryIds, id]
      : selectedCategoryIds.filter((value) => value !== id);
  }

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
  const when = (v: number | string | null) =>
    v ? formatter.format(new Date(typeof v === 'number' ? v * 1000 : v)) : '—';

  /** Extrait lisible du texte riche, pour la colonne de liste. */
  function summary(row: PostRow): string {
    const text = (row.excerpt || row.bodyHtml || '')
      .replace(/<\/(p|li|ul|ol)\s*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 90 ? `${text.slice(0, 89)}…` : text;
  }

  const filteredPosts = $derived(
    posts.filter((row: PostRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.path.toLowerCase().includes(term) ||
        (row.excerpt || '').toLowerCase().includes(term)
      );
    })
  );

  async function post(body: unknown, fallback: string) {
    const response = await fetch('', {
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

  function resetForm() {
    editingId = null;
    title = '';
    excerpt = '';
    bodyHtml = '<p></p>';
    coverMediaId = null;
    selectedCategoryIds = [];
    errorMsg = '';
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(row: PostRow) {
    editingId = row.id;
    title = row.title;
    excerpt = row.excerpt ?? '';
    bodyHtml = row.bodyHtml || '<p></p>';
    coverMediaId = row.coverMediaId;
    selectedCategoryIds = (row.categories ?? []).map((c) => c.id);
    errorMsg = '';
    showFormSheet = true;
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const id = editingId;

    await submitForm({
      validate: () => (title.trim() ? null : "Le titre de l'actualité est obligatoire."),
      submit: () =>
        post(
          id
            ? {
                action: 'update', id, title: title.trim(), excerpt: excerpt.trim(), bodyHtml,
                coverMediaId, categoryIds: selectedCategoryIds
              }
            : {
                action: 'create', title: title.trim(), excerpt: excerpt.trim(), bodyHtml,
                coverMediaId, categoryIds: selectedCategoryIds
              },
          id ? 'La modification a échoué.' : 'La création a échoué.'
        ),
      success: id ? 'Actualité mise à jour.' : 'Actualité créée en brouillon.',
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

  async function togglePublish(row: PostRow) {
    try {
      await post({ action: 'publish', id: row.id, published: row.status !== 'published' }, "L'opération a échoué.");
      flashAndReload(row.status === 'published' ? 'Actualité retirée.' : 'Actualité publiée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  async function remove(row: PostRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: `L'adresse ${row.path} ne répondra plus. Si l'actualité a été partagée, pensez à créer une redirection.`,
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Actualité supprimée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<DataTable
  data={filteredPosts}
  emptyTitle="Aucune actualité"
  emptyDescription={searchTerm.trim()
    ? 'Aucune actualité ne correspond à votre recherche.'
    : 'Créez la première actualité du club.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une actualité..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if canWrite}
          <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvelle actualité</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filteredPosts as row (row.id)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">{row.title}</h4>
              <p class="mt-1 text-xs text-muted-foreground">{summary(row)}</p>
              <code class="mt-1 block truncate text-xs text-muted-foreground">{row.path}</code>
            </div>
            <div class="shrink-0 text-right">
              <Badge variant={row.status === 'published' ? 'primary-soft' : 'outline'} size="xs">
                {row.status === 'published' ? 'En ligne' : 'Brouillon'}
              </Badge>
              <span class="mt-1 block text-xs text-muted-foreground">{when(row.publishedAt)}</span>
            </div>
          </div>

          {#if canWrite || canDelete}
            <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
              {#if canWrite}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => startEdit(row)}
                  class="h-8 flex-1 gap-1.5 text-xs font-semibold"
                >
                  <Edit class="h-3.5 w-3.5" />
                  <span>Modifier</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => togglePublish(row)}
                  class="h-8 flex-1 gap-1.5 text-xs font-semibold"
                >
                  {#if row.status === 'published'}
                    <EyeOff class="h-3.5 w-3.5" />
                    <span>Retirer</span>
                  {:else}
                    <Eye class="h-3.5 w-3.5" />
                    <span>Publier</span>
                  {/if}
                </Button>
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
    <Table.Head>Titre</Table.Head>
    <Table.Head>Adresse</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head>Publiée le</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(item)}
    <Table.Row>
      <Table.Cell class="font-medium">
        <span class="block text-foreground">{item.title}</span>
        <span class="block text-xs text-muted-foreground">{summary(item)}</span>
      </Table.Cell>
      <Table.Cell>
        <code class="text-xs text-muted-foreground">{item.path}</code>
      </Table.Cell>
      <Table.Cell>
        <Badge variant={item.status === 'published' ? 'primary-soft' : 'outline'}>
          {item.status === 'published' ? 'En ligne' : 'Brouillon'}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{when(item.publishedAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          {#if canWrite}
            <DropdownMenu.Item onclick={() => startEdit(item)} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />
              Modifier
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => togglePublish(item)} class="cursor-pointer">
              {#if item.status === 'published'}
                <EyeOff class="mr-2 h-3.5 w-3.5" />
                Repasser en brouillon
              {:else}
                <Eye class="mr-2 h-3.5 w-3.5" />
                Publier
              {/if}
            </DropdownMenu.Item>
          {/if}
          {#if item.status === 'published'}
            <DropdownMenu.Item onclick={() => window.open(item.path, '_blank', 'noopener')} class="cursor-pointer">
              <ExternalLink class="mr-2 h-3.5 w-3.5" />
              Voir sur le site
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
  title={editingId ? "Modifier l'actualité" : 'Nouvelle actualité'}
  description={editingId
    ? "Modifiez le titre, le chapô ou le texte. Le statut se change depuis la liste."
    : "L'actualité est créée en brouillon : elle n'apparaît sur le site qu'une fois publiée."}
  icon={editingId ? Edit : Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel={editingId ? 'Enregistrer' : 'Créer en brouillon'}
  submittingLabel={editingId ? 'Enregistrement…' : 'Création…'}
  size="lg"
  onSubmit={save}
>
  <FormField id="post-title" label="Titre">
    <Input id="post-title" bind:value={title} placeholder="Soirée raclette 2026" maxlength={200} />
  </FormField>

  <FormField id="post-excerpt" label="Chapô">
    <Input
      id="post-excerpt"
      bind:value={excerpt}
      placeholder="Une phrase d'accroche, reprise dans les listes et les partages"
      maxlength={500}
    />
  </FormField>

  <FormField id="post-cover" label="Image de couverture">
    {#if coverMedia}
      <div class="border-border flex items-center gap-3 rounded-md border p-2">
        <img
          src={mediaUrl(coverMedia.key)}
          alt={coverMedia.alt}
          class="h-16 w-24 shrink-0 rounded object-cover"
        />
        <span class="min-w-0 flex-1 truncate text-sm">{coverMedia.alt || '(sans description)'}</span>
        <Button type="button" variant="ghost" size="sm" onclick={() => (coverPickerOpen = true)}>
          Remplacer
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onclick={() => (coverMediaId = null)}>
          <X class="h-4 w-4" />
          <span class="sr-only">Retirer la couverture</span>
        </Button>
      </div>
    {:else}
      <Button type="button" variant="outline" class="gap-1.5" onclick={() => (coverPickerOpen = true)}>
        <ImagePlus class="h-4 w-4" />
        Choisir une image
      </Button>
    {/if}
  </FormField>

  {#if categories.length > 0}
    <fieldset class="space-y-1.5">
      <legend class="text-sm font-medium">Catégories</legend>
      <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        {#each categories as category (category.id)}
          <div class="flex items-center gap-2">
            <Checkbox
              id={`post-cat-${category.id}`}
              checked={selectedCategoryIds.includes(category.id)}
              onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
            />
            <Label for={`post-cat-${category.id}`} class="cursor-pointer font-normal">
              {category.name}
            </Label>
          </div>
        {/each}
      </div>
    </fieldset>
  {/if}

  <FormField id="post-body" label="Texte">
    <RichTextEditor
      id="post-body"
      bind:value={bodyHtml}
      disabled={busy}
      onPickFile={pickFile}
      onPickImage={pickInlineImage}
    />
  </FormField>
</FormSheet>

<MediaPicker
  bind:open={coverPickerOpen}
  {media}
  kind="image"
  title="Image de couverture"
  onSelect={(item) => (coverMediaId = item.id)}
/>

<MediaPicker
  bind:open={filePickerOpen}
  {media}
  kind="document"
  title="Fichier à insérer"
  onSelect={onFileChosen}
/>

<MediaPicker
  bind:open={inlineImagePickerOpen}
  {media}
  kind="image"
  title="Image à insérer dans le texte"
  onSelect={onInlineImageChosen}
/>
