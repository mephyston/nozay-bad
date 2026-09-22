<script lang="ts">
  import { Plus, Pencil, Upload } from '@lucide/svelte';
  import { mediaUrl } from '../../media-url';
  import {
    ActionSheet,
    Button,
    Input,
    Card,
    ChoiceField,
    EmptyState,
    DataTableToolbar,
    FilterSheet,
    FormField,
    FormSheet,
    dockDePage,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { uploadFile, updateMediaAlt, deleteMedia } from './media-actions';
  import { humanSize } from './media-upload';
  import {
    detailDeMedia,
    estImage,
    gestesDeMedia,
    mediasFiltres,
    nomDeMedia,
    NATURES_DE_MEDIA,
    type NatureDeMedia
  } from './media-row-model';

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

  let nature = $state<NatureDeMedia>('tous');
  let filtresOuverts = $state(false);

  const filteredMedia = $derived(
    mediasFiltres(media as MediaRow[], { recherche: searchTerm, nature })
  );

  const droits = $derived({ canWrite, canDelete });

  /* La feuille d'actions de la vignette appuyée : une seule à la fois. */
  let gestesOuverts = $state(false);
  let medium = $state<MediaRow | null>(null);

  const gestes = {
    onOpen: (m: MediaRow) => window.open(mediaUrl(m.key), '_blank', 'noopener'),
    onEdit: (m: MediaRow) => openEditForm(m),
    onDelete: (m: MediaRow) => remove(m)
  };

  function ouvrirLesGestes(m: MediaRow) {
    medium = m;
    gestesOuverts = true;
  }

  /* Déposer descend dans la barre du bas. */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'deposer', label: 'Ajouter un média', icon: Upload, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Ajouter un média' });
  });

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
        // Créé, la vignette apparaît et le dit mieux qu'un message. Déjà présent,
        // rien ne bouge à l'écran : c'est le seul cas qui demande une phrase.
        cree ? '' : 'Ce fichier était déjà dans la médiathèque : rien n’a été ajouté.',
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
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

<div class="space-y-4">
  <DataTableToolbar
    bind:searchValue={searchTerm}
    searchPlaceholder="Rechercher un média..."
    dockSearch
    hasFilters={true}
    filtersActive={nature !== 'tous'}
    onOpenFilters={() => (filtresOuverts = true)}
    activeFilters={nature === 'tous'
      ? []
      : [
          {
            id: 'nature',
            label: NATURES_DE_MEDIA.find((o) => o.value === nature)?.label ?? '',
            onRemove: () => (nature = 'tous')
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
          description={searchTerm.trim() || nature !== 'tous'
            ? 'Aucun média ne correspond à ces critères.'
            : 'Déposez une image ou un document pour commencer.'}
        />
      </Card.Content>
    </Card.Root>
  {:else}
    <!--
      La vignette **est** l'affordance : l'appuyer ouvre la feuille d'actions. Un menu
      « … » était posé sur chacune — soixante boutons de douze pixels sur une grille à
      deux colonnes, là où la règle en veut un seul par rangée. Au clavier et au
      lecteur d'écran, le bouton porte le nom du média et la feuille nomme chaque geste.
    -->
    <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {#each filteredMedia as row, rang (row.id)}
        <li class="overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            class="w-full text-left"
            onclick={() => ouvrirLesGestes(row)}
            aria-label={`${nomDeMedia(row)} — actions`}
          >
            <div class="flex aspect-video items-center justify-center overflow-hidden bg-muted">
              {#if estImage(row)}
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
              <p class="truncate font-medium">{nomDeMedia(row)}</p>
              <p class="text-xs text-muted-foreground">{detailDeMedia(row)}</p>
            </div>
          </button>
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

{#if medium}
  <ActionSheet
    bind:open={gestesOuverts}
    title={nomDeMedia(medium)}
    actions={gestesDeMedia(medium, droits, gestes)}
    item={medium}
  />
{/if}

<!-- Les critères se posent derrière la loupe, jamais ailleurs. -->
{#snippet criteres()}
  <FormField id="filter-nature-media" label="Nature">
    <ChoiceField
      id="filter-nature-media"
      label="Nature"
      value={nature}
      onChange={(v) => (nature = v as NatureDeMedia)}
      options={NATURES_DE_MEDIA}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="Les documents n'ont pas de vignette : les isoler évite de les chercher entre deux photos."
  resultCount={filteredMedia.length}
  itemName="média"
  itemNamePlural="médias"
  onReset={() => (nature = 'tous')}
>
  {@render criteres()}
</FilterSheet>
