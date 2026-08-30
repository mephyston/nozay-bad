<script lang="ts">
  import { Plus, Trash2, ExternalLink, Upload, Pencil } from '@lucide/svelte';
  import { mediaUrl } from '../../media-url';
  import {
    Button,
    Input,
    Card,
    EmptyState,
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
  import { uploadFile, updateMediaAlt, deleteMedia } from './media-actions';
  import { humanSize } from './media-upload';

  interface MediaRow {
    id: number;
    key: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    alt: string;
    createdAt: number | string;
  }

  let { media = [], canWrite = false, canDelete = false } = $props<{
    media: MediaRow[];
    canWrite?: boolean;
    canDelete?: boolean;
  }>();

  let file = $state<File | null>(null);
  let alt = $state('');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');

  /*
    Second formulaire, et non le premier réutilisé : déposer demande un fichier,
    reprendre une description n'en demande aucun. Un formulaire unique aurait porté un
    champ fichier tantôt requis tantôt interdit, et le fichier déposé n'est de toute
    façon pas remplaçable — sa clé porte l'empreinte de son contenu.
  */
  let editing = $state<MediaRow | null>(null);
  let showEditSheet = $state(false);
  let editAlt = $state('');
  let editError = $state('');
  let editBusy = $state(false);

  const isImage = (mime: string) => mime.startsWith('image/');

  const filteredMedia = $derived(
    media.filter((row: MediaRow) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return row.alt.toLowerCase().includes(term) || row.key.toLowerCase().includes(term);
    })
  );

  function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
  }

  /*
   * Glisser-déposer.
   *
   * Le champ fichier reste, et reste le chemin principal : il est atteignable au clavier
   * et annoncé par les lecteurs d'écran, ce qu'une zone de dépôt seule ne serait pas. Le
   * dépôt est un raccourci pour la souris, posé par-dessus.
   */
  const TYPES_ACCEPTES = /^(image\/|application\/pdf$)/;
  let survol = $state(false);

  /** Un seul fichier : le formulaire ne décrit qu'un texte alternatif à la fois. */
  function deposer(event: DragEvent) {
    event.preventDefault();
    survol = false;

    const depose = event.dataTransfer?.files?.[0];
    if (!depose) return;

    // Refuser ici plutôt que de laisser l'API le faire : le message arrive avant l'envoi,
    // et l'utilisateur n'attend pas pour rien. Même liste que le champ fichier.
    if (!TYPES_ACCEPTES.test(depose.type)) {
      errorMsg = 'Ce type de fichier n’est pas accepté : images et PDF seulement.';
      return;
    }

    errorMsg = '';
    file = depose;
  }

  function survoler(event: DragEvent) {
    // Sans `preventDefault`, le navigateur ouvre le fichier à la place de le déposer.
    event.preventDefault();
    survol = true;
  }

  function openAddForm() {
    file = null;
    alt = '';
    errorMsg = '';
    showFormSheet = true;
  }

  async function submit(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    const picked = file;

    await submitForm({
      validate: () => {
        if (!picked) return 'Choisissez un fichier à déposer.';
        // Le texte alternatif conditionne l'accessibilité et la recherche d'images ; il
        // est demandé au dépôt parce que personne ne revient le remplir ensuite.
        if (isImage(picked.type) && alt.trim() === '') {
          return "Décrivez l'image en quelques mots, ou indiquez qu'elle est décorative.";
        }
        return null;
      },
      submit: () => uploadFile(picked as File, alt.trim()),
      /*
        L'API déduplique par empreinte de contenu : redéposer un fichier déjà présent
        rend la ligne existante sans rien créer. Annoncer « ajouté » dans ce cas envoyait
        chercher une vignette qui n'apparaîtra jamais — le succès était vrai, le message
        faux.
      */
      success: ({ cree }) =>
        cree
          ? 'Média ajouté.'
          : 'Ce fichier était déjà dans la médiathèque : rien n’a été ajouté.',
      close: () => {
        file = null;
        alt = '';
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }

  function openEditForm(row: MediaRow) {
    editing = row;
    editAlt = row.alt;
    editError = '';
    showEditSheet = true;
  }

  async function submitEdit(event: Event) {
    event.preventDefault();
    editError = '';
    editBusy = true;

    const row = editing;

    await submitForm({
      validate: () => {
        if (!row) return 'Aucun média sélectionné.';
        // Même exigence qu'au dépôt : une image sans description n'est lisible ni par
        // un lecteur d'écran, ni par la recherche de la médiathèque.
        if (isImage(row.mimeType) && editAlt.trim() === '') {
          return "Décrivez l'image en quelques mots, ou indiquez qu'elle est décorative.";
        }
        return null;
      },
      submit: () => updateMediaAlt((row as MediaRow).id, editAlt.trim()),
      success: 'Description modifiée.',
      close: () => {
        editing = null;
        editAlt = '';
        showEditSheet = false;
      },
      onError: (message) => {
        editError = message;
      }
    });

    editBusy = false;
  }

  async function remove(row: MediaRow) {
    const confirmed = await uiConfirm({
      title: 'Supprimer ce média ?',
      description: 'Il disparaîtra de la médiathèque. Les pages qui l’utilisent doivent être corrigées avant.',
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;

    try {
      await deleteMedia(row.id);
      flashAndReload('Média supprimé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<div class="space-y-4">
  <DataTableToolbar
    bind:searchValue={searchTerm}
    searchPlaceholder="Rechercher un média..."
    hasFilters={false}
  >
    {#snippet actions()}
      {#if canWrite}
        <Button onclick={openAddForm} class="h-9 shrink-0 gap-1.5 font-bold">
          <Plus class="h-4 w-4" />
          <span>Ajouter un média</span>
        </Button>
      {/if}
    {/snippet}
  </DataTableToolbar>

  <!--
    La médiathèque garde sa grille de vignettes plutôt qu'un tableau : on y cherche une
    image à l'œil, pas une ligne. Elle reprend en revanche la barre d'outils et le menu
    d'actions des autres écrans.
  -->
  {#if filteredMedia.length === 0}
    <Card.Root>
      <Card.Content class="p-6">
        <EmptyState
          icon={Upload}
          title="Aucun média"
          description={searchTerm.trim()
            ? 'Aucun média ne correspond à votre recherche.'
            : 'Déposez une image ou un document pour commencer.'}
        />
      </Card.Content>
    </Card.Root>
  {:else}
    <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {#each filteredMedia as row, rang (row.id)}
        <li class="overflow-hidden rounded-lg border border-border">
          <div class="flex aspect-video items-center justify-center overflow-hidden bg-muted">
            {#if isImage(row.mimeType)}
              <!--
                Les vignettes du premier écran sont demandées tout de suite, les suivantes
                paresseusement. `loading="lazy"` partout retardait justement celles qu'on
                regarde : le navigateur attend d'avoir calculé la mise en page pour décider
                si l'image est visible, et l'écran restait gris un instant de trop. Douze
                couvre quatre colonnes sur trois rangs, la grille la plus large.
              -->
              <img
                src={mediaUrl(row.key)}
                alt={row.alt}
                width={row.width ?? undefined}
                height={row.height ?? undefined}
                loading={rang < 12 ? 'eager' : 'lazy'}
                fetchpriority={rang < 12 ? 'high' : 'auto'}
                decoding="async"
                class="h-full w-full object-cover"
              />
            {:else}
              <span class="text-3xl" aria-hidden="true">📄</span>
            {/if}
          </div>
          <div class="space-y-1 p-3 text-sm">
            <div class="flex items-start justify-between gap-2">
              <p class="min-w-0 flex-1 truncate font-medium">{row.alt || '(sans description)'}</p>
              <DataTableRowActions>
                <DropdownMenu.Label>Actions</DropdownMenu.Label>
                <DropdownMenu.Item
                  onclick={() => window.open(mediaUrl(row.key), '_blank', 'noopener')}
                  class="cursor-pointer"
                >
                  <ExternalLink class="mr-2 h-3.5 w-3.5" />
                  Ouvrir
                </DropdownMenu.Item>
                {#if canWrite}
                  <DropdownMenu.Item onclick={() => openEditForm(row)} class="cursor-pointer">
                    <Pencil class="mr-2 h-3.5 w-3.5" />
                    Modifier la description
                  </DropdownMenu.Item>
                {/if}
                {#if canDelete}
                  <DropdownMenu.Item
                    onclick={() => remove(row)}
                    class="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 class="mr-2 h-3.5 w-3.5" />
                    Supprimer
                  </DropdownMenu.Item>
                {/if}
              </DataTableRowActions>
            </div>
            <p class="text-xs text-muted-foreground">
              {humanSize(row.sizeBytes)}{#if row.width} · {row.width}×{row.height}{/if}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<FormSheet
  bind:open={showFormSheet}
  title="Ajouter un média"
  description="Les images sont réduites à 1600 px et converties en WebP dans le navigateur avant l'envoi."
  icon={Plus}
  error={errorMsg}
  isSubmitting={busy}
  submitLabel="Ajouter"
  submittingLabel="Envoi…"
  onSubmit={submit}
>
  {#snippet submitIcon()}
    <Upload class="h-4 w-4" />
  {/snippet}

  <FormField id="media-file" label="Fichier">
    <!--
      La zone enveloppe le champ plutôt que de le remplacer : déposer et parcourir mènent
      au même état, et le champ garde son étiquette, son focus et son annonce.
    -->
    <div
      role="presentation"
      ondragover={survoler}
      ondragenter={survoler}
      ondragleave={() => (survol = false)}
      ondrop={deposer}
      class="rounded-lg border-2 border-dashed p-4 transition-colors {survol
        ? 'border-primary bg-primary/5'
        : 'border-border'}"
    >
      <Input id="media-file" type="file" accept="image/*,application/pdf" onchange={pick} />
      <p class="mt-2 text-xs text-muted-foreground">
        {#if file}
          {file.name} · {humanSize(file.size)}
        {:else}
          Ou déposez un fichier ici — image ou PDF.
        {/if}
      </p>
    </div>
  </FormField>

  <FormField id="media-alt" label="Texte alternatif">
    <Input id="media-alt" bind:value={alt} placeholder="Ce que montre l'image" />
  </FormField>
</FormSheet>

<FormSheet
  bind:open={showEditSheet}
  title="Modifier la description"
  description="Le fichier déposé ne change pas : cette description sert au site public et à retrouver le média ici."
  icon={Pencil}
  error={editError}
  isSubmitting={editBusy}
  submitLabel="Enregistrer"
  submittingLabel="Enregistrement…"
  onSubmit={submitEdit}
>
  <FormField id="media-edit-alt" label="Texte alternatif">
    <Input id="media-edit-alt" bind:value={editAlt} placeholder="Ce que montre l'image, ou le nom du document" />
  </FormField>
</FormSheet>
