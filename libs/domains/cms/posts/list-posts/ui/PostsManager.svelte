<script lang="ts">
  import { Plus, Edit } from '@lucide/svelte';
  import { mediaPath, mediaUrl, websiteOrigin } from '../../../media/media-url';
  import MediaPicker, { type PickableMedia } from '../../../media/list-media/ui/MediaPicker.svelte';
  import {
    Button,
    Input,
    Badge,
    ChoiceField,
    MediaField,
    MultiChoiceField,
    SearchableCombobox,
    Table,
    DataTable,
    DataTableToolbar,
    DataTableRowActions,
    RowActionItems,
    DropdownMenu,
    dockDePage,
    FormField,
    FormSheet,
    RichTextEditor,
    submitForm,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import PostsList from './PostsList.svelte';
  import { gestesDActualite, pastillesDeTableau } from './posts-row-model';

  interface PostRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    visibility: 'public' | 'private';
    notifiedAt: number | string | null;
    excerpt: string | null;
    bodyHtml: string;
    coverMediaId: number | null;
    categories?: { id: number; name: string }[];
    publishedAt: number | string | null;
    /** Événement de l'agenda annoncé par l'actualité, s'il y en a un. */
    eventId: number | null;
  }

  let {
    posts = [],
    media = [],
    categories = [],
    canWrite = false,
    canDelete = false,
    canUploadMedia = false,
    canNotify = false,
    targets = [],
    events = [],
    endpoint = '/admin/api/cms/posts'
  } = $props<{
    posts: PostRow[];
    /** Médiathèque, déjà chargée par la page : sert la couverture et l'insertion de fichiers. */
    media?: PickableMedia[];
    categories?: { id: number; name: string }[];
    canWrite?: boolean;
    canDelete?: boolean;
    /** `cms:media:write` : autorise le dépôt depuis les sélecteurs, sans passer par la médiathèque. */
    canUploadMedia?: boolean;
    /** `notifications:messages:send` : faire sonner les téléphones du club est un droit à part. */
    canNotify?: boolean;
    /** Pages et actualités du site, proposées à l'insertion d'un lien interne. */
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
    /**
     * Événements de l'agenda proposés au rattachement.
     *
     * La page ne charge que les rendez-vous à venir : rattacher une actualité à un
     * stage de l'an dernier n'a pas de sens, et la liste resterait lisible.
     */
    events?: { id: number; title: string; startsAt: string; registration: string }[];
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  /**
   * Cibles traduites dans le vocabulaire de `RichTextEditor`, qui ignore tout du CMS.
   *
   * Le statut est affiché sans filtrer : lier une page en brouillon est parfois
   * délibéré — on prépare un dossier, on publie les deux ensemble. Le masquer
   * laisserait l'auteur croire que la page n'existe pas ; l'afficher le prévient que
   * le lien tombera en 404 tant que la publication n'a pas suivi.
   */
  const linkSuggestions = $derived(
    targets.map((target: { path: string; title: string; status?: string }) => ({
      href: target.path,
      label: target.title,
      hint: target.status === 'draft' ? 'Brouillon' : 'Publié'
    }))
  );

  let editingId = $state<number | null>(null);
  let title = $state('');
  let excerpt = $state('');
  let bodyHtml = $state('<p></p>');
  let busy = $state(false);
  let showFormSheet = $state(false);
  let errorMsg = $state('');
  let searchTerm = $state('');
  let coverMediaId = $state<number | null>(null);
  let visibility = $state<'public' | 'private'>('public');
  let selectedCategoryIds = $state<number[]>([]);
  /** `0` vaut « aucun » : une liste déroulante ne transporte que des chaînes. */
  let eventId = $state<number>(0);
  /** Date de publication, au format d'un champ `datetime-local` : « 2026-03-14T18:30 ». */
  let publishedAt = $state('');
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

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

  /**
   * Date d'un événement dans la liste déroulante.
   *
   * Les dates de l'agenda sont stockées en heure locale sans fuseau : les relire telles
   * quelles évite le décalage qu'introduirait un passage par UTC.
   */
  const eventFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const eventWhen = (value: string) => eventFormatter.format(new Date(`${value}:00`));
  const when = (v: number | string | null) =>
    v ? formatter.format(new Date(typeof v === 'number' ? v * 1000 : v)) : '—';

  /**
   * La même date, mais telle qu'un champ `datetime-local` la veut.
   *
   * Découpée sur l'heure **locale** et non sur l'ISO : `toISOString()` rendrait l'heure
   * UTC, et un article publié à 00 h 30 se présenterait daté de la veille — exactement le
   * décalage d'un jour qu'on cherche à éviter en offrant ce champ.
   */
  const asLocalInput = (v: number | string | null): string => {
    if (!v) return '';
    const d = new Date(typeof v === 'number' ? v * 1000 : v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Pas d'extrait du corps dans la liste : quatre-vingt-dix caractères de texte sous
  // chaque titre étiraient les lignes sur toute la largeur de l'écran et noyaient ce
  // qu'on vient y chercher — quel article, en ligne ou non, publié quand. Le chapô et
  // le texte se lisent dans le formulaire, qui est fait pour ça.

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

  /**
   * Diffuse une actualité réservée sur les téléphones des adhérents.
   *
   * Confirmation obligatoire, et volontairement explicite sur le caractère définitif :
   * l'envoi atteint tout le club immédiatement et ne se rattrape pas. L'API refuse un
   * second envoi, mais un adhérent réveillé pour rien ne se dé-réveille pas.
   */
  async function notify(row: PostRow) {
    const confirmed = await uiConfirm({
      title: `Prévenir les adhérents de « ${row.title} » ?`,
      description:
        'Tous les adhérents abonnés recevront une notification sur leur téléphone, immédiatement. Cet envoi ne peut pas être annulé, ni renouvelé.',
      confirmLabel: 'Diffuser'
    });
    if (!confirmed) return;

    try {
      await post({ action: 'notify', id: row.id }, 'La diffusion a échoué.');
      flashAndReload('Actualité diffusée aux adhérents.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La diffusion a échoué.');
    }
  }

  function resetForm() {
    editingId = null;
    title = '';
    excerpt = '';
    bodyHtml = '<p></p>';
    coverMediaId = null;
    visibility = 'public';
    selectedCategoryIds = [];
    eventId = 0;
    publishedAt = '';
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
    visibility = row.visibility ?? 'public';
    selectedCategoryIds = (row.categories ?? []).map((c) => c.id);
    eventId = row.eventId ?? 0;
    publishedAt = asLocalInput(row.publishedAt);
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
                coverMediaId, categoryIds: selectedCategoryIds, visibility,
                // Toujours transmise : vidée, `null` retire la date et l'actualité
                // retombe au rang que lui donne sa date de création.
                publishedAt: publishedAt || null,
                // `null` détache l'événement, un entier le rattache. Jamais `undefined`
                // en modification : ce serait « ne rien changer », et détacher
                // deviendrait impossible depuis l'écran.
                eventId: Number(eventId) || null
              }
            : {
                action: 'create', title: title.trim(), excerpt: excerpt.trim(), bodyHtml,
                coverMediaId, categoryIds: selectedCategoryIds, visibility,
                // Omise si vide : à la création, une date renseignée publie d'emblée,
                // et l'absence de date est ce qui fait naître un brouillon.
                publishedAt: publishedAt || undefined,
                eventId: Number(eventId) || null
              },
          id ? 'La modification a échoué.' : 'La création a échoué.'
        ),
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
      uiAlert(error instanceof Error ? error.message : "L'opération a échoué.");
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
      uiAlert(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
  const droits = $derived({ canWrite, canDelete, canNotify });

  /*
    Les gestes, dans le vocabulaire du modèle. « Voir sur le site » vise le domaine
    public : l'adresse est relative au site, la résoudre sur celui de l'administration
    donnerait un « Accès refusé ».
  */
  const gestes = {
    onEdit: (row: PostRow) => startEdit(row),
    onTogglePublish: (row: PostRow) => togglePublish(row),
    onNotify: (row: PostRow) => notify(row),
    onOpenSite: (row: PostRow) => window.open(`${websiteOrigin}${row.path}`, '_blank', 'noopener'),
    onDelete: (row: PostRow) => remove(row)
  };

  /*
    Créer descend dans la barre du bas : sur un téléphone, le bouton vivait en haut
    d'une barre d'outils qui défile avec la liste et sortait de l'écran dès la
    troisième actualité.
  */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'nouvelle', label: 'Nouvelle actualité', icon: Plus, run: () => openAddForm() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouvelle actualité' });
  });
</script>

<!--
  Un seul jeu d'actions, déclaré en données et rendu de trois façons : le menu de la
  ligne du tableau, le menu replié de la liste, et le balayage. Il vivait en markup
  dans ce fichier — partagé entre la carte mobile et la table, ce qui était déjà un
  progrès, mais le doigt n'y avait pas accès et rien ne se testait sans monter l'écran.
-->
{#snippet actionsMenu(row: PostRow)}
  {@const actions = gestesDActualite(row, droits, gestes)}
  {#if actions.length > 0}
    <DataTableRowActions>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      <RowActionItems {actions} item={row} />
    </DataTableRowActions>
  {/if}
{/snippet}

<!-- Les mêmes pastilles que la liste au doigt, plus « En ligne » : le tableau a une
     colonne pour ça, et l'y laisser vide ressemblerait à une donnée manquante. -->
{#snippet statusBadges(row: PostRow)}
  <div class="flex flex-wrap items-center gap-1.5">
    {#each pastillesDeTableau(row, canNotify) as pastille (pastille.label)}
      <Badge variant={pastille.variant}>{pastille.label}</Badge>
    {/each}
  </div>
{/snippet}

<DataTable
  data={filteredPosts}
  mobileSpacing="list"
  emptyTitle="Aucune actualité"
  emptyDescription={searchTerm.trim()
    ? 'Aucune actualité ne correspond à votre recherche.'
    : 'Créez la première actualité du club.'}
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une actualité..."
      dockSearch
      hasFilters={false}
    >
      {#snippet actions()}
        <!-- Sur téléphone, ce geste vit dans la barre du bas. -->
        {#if canWrite}
          <Button onclick={openAddForm} class="hidden h-9 shrink-0 gap-1.5 font-bold md:flex">
            <Plus class="h-4 w-4" />
            <span>Nouvelle actualité</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <PostsList posts={filteredPosts} {droits} {...gestes} />
  {/snippet}

  {#snippet header()}
    <Table.Head>Titre</Table.Head>
    <Table.Head>Adresse</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head class="whitespace-nowrap">Publiée le</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(item)}
    <Table.Row>
      <!-- Largeurs plafonnées : sans elles, un titre long ou une adresse à rallonge
           étirait la ligne et repoussait le statut et la date hors de vue. -->
      <Table.Cell class="font-medium">
        <span class="block max-w-[26rem] truncate text-foreground" title={item.title}>{item.title}</span>
      </Table.Cell>
      <Table.Cell>
        <code class="block max-w-[18rem] truncate text-xs text-muted-foreground" title={item.path}>{item.path}</code>
      </Table.Cell>
      <Table.Cell>
        {@render statusBadges(item)}
      </Table.Cell>
      <Table.Cell class="whitespace-nowrap text-muted-foreground">{when(item.publishedAt)}</Table.Cell>
      <Table.Cell class="relative text-right">
        {@render actionsMenu(item)}
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

  <!--
    Deux boutons radio et leurs deux paragraphes tenaient cent pixels de haut pour
    un choix binaire, avec des cibles de 16 px. Une rangée le porte : l'intitulé à
    gauche, la réponse à droite, et le menu explique chaque option à l'ouverture.
  -->
  <FormField
    id="post-visibility"
    label="Qui peut la lire"
    hint={visibility === 'private'
      ? "Visible dans l'espace adhérent uniquement. Peut être diffusée en notification depuis la liste, une fois publiée."
      : 'Publiée sur le site public et dans l’espace adhérent.'}
  >
    <ChoiceField
      id="post-visibility"
      label="Qui peut la lire"
      value={visibility}
      onChange={(v) => (visibility = v as 'public' | 'private')}
      options={[
        { value: 'public', label: 'Tout le monde', hint: 'Site public et espace adhérent' },
        { value: 'private', label: 'Adhérents seulement', hint: 'Espace adhérent, diffusable' }
      ]}
    />
  </FormField>

  <!--
    La même rangée que l'image d'un produit, mais l'appui mène à la médiathèque et
    non au sélecteur du système : une couverture se réemploie d'un article à
    l'autre, et le site la sert depuis sa bibliothèque.
  -->
  <FormField id="post-cover" label="Image de couverture">
    <MediaField
      id="post-cover"
      label="Image de couverture"
      max={1}
      preview={coverMedia ? mediaUrl(coverMedia.key) : null}
      names={coverMedia ? [coverMedia.alt || 'Couverture'] : undefined}
      onBrowse={() => (coverPickerOpen = true)}
      onClear={() => (coverMediaId = null)}
    />
  </FormField>

  {#if categories.length > 0}
    <!--
      Six cases à cocher en colonnes irrégulières, pour un ou deux choix : une
      rangée dit ce qui est retenu et mène à l'écran de choix. La grille reste à la
      souris, où voir les six d'un coup vaut mieux qu'une navigation.
    -->
    <FormField id="post-categories" label="Catégories">
      <MultiChoiceField
        id="post-categories"
        label="Catégories"
        title="Catégories de l'actualité"
        description="Elles rangent l'actualité dans les rubriques du site."
        values={selectedCategoryIds.map(String)}
        onChange={(v) => (selectedCategoryIds = v.map(Number))}
        options={categories.map((c: { id: number; name: string }) => ({
          value: String(c.id),
          label: c.name
        }))}
      />
    </FormField>
  {/if}

  <!--
    Le champ reste affiché même sans aucun événement à venir.
    Le masquer laissait croire que la fonctionnalité n'existait pas, là où il n'y avait
    simplement rien à l'agenda — un écran muet ne se distingue pas d'un écran cassé.
  -->
  <FormField id="post-published-at" label="Date de publication">
    <Input id="post-published-at" type="datetime-local" bind:value={publishedAt} />
    <p class="mt-1 text-xs text-muted-foreground">
      {editingId === null
        ? "C'est la date à laquelle l'actualité se rangera dans le fil : reculez-la pour un article ressaisi après coup. Elle ne publie pas — l'actualité reste en brouillon."
        : "C'est elle qui range l'actualité dans le fil. Reculez-la pour qu'un article ressaisi se place à la date des faits qu'il raconte."}
    </p>
  </FormField>

  <!-- « (facultatif) » quitte l'intitulé : sur une rangée, il prenait la place de la
       réponse, qui s'affichait « Tournoi … ». Le texte sous le champ le dit. -->
  <FormField id="post-event" label="Événement lié">
    <!--
      Des intitulés de cette longueur — titre, date, heure, état des inscriptions —
      ne tiennent pas dans un menu ancré : l'écran de choix leur donne la largeur,
      et sa recherche retrouve un rendez-vous sans dérouler tout l'agenda.
    -->
    <SearchableCombobox
      id="post-event"
      value={String(eventId)}
      onValueChange={(v) => (eventId = Number(v))}
      disabled={events.length === 0}
      placeholder="Aucun"
      searchPlaceholder="Rechercher un rendez-vous…"
      emptyText="Aucun rendez-vous ne correspond."
      items={[
        { value: '0', label: 'Aucun' },
        ...events.map((event: { id: number; title: string; startsAt: string; registration: string }) => ({
          value: String(event.id),
          label: event.title,
          hint: `${eventWhen(event.startsAt)}${event.registration === 'open' ? ' · inscriptions ouvertes' : ''}`
        }))
      ]}
    />
    <p class="text-muted-foreground mt-1 text-xs">
      {#if events.length === 0}
        Facultatif. Aucun rendez-vous à venir dans l'agenda. Créez-le d'abord dans
        <a href="/admin/website/events" class="text-primary hover:underline">Agenda</a>,
        il sera alors proposé ici.
      {:else}
        Facultatif. L'actualité annonce alors ce rendez-vous : si ses inscriptions sont ouvertes, le
        bouton d'inscription apparaît au bout de l'article dans l'espace adhérent. Seuls
        les événements à venir sont proposés.
      {/if}
    </p>
  </FormField>

  <FormField id="post-body" label="Texte">
    <RichTextEditor
      id="post-body"
      bind:value={bodyHtml}
      disabled={busy}
      mediaOrigin={websiteOrigin}
      {linkSuggestions}
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
  canUpload={canUploadMedia}
  onSelect={(item) => (coverMediaId = item.id)}
/>

<MediaPicker
  bind:open={filePickerOpen}
  {media}
  kind="document"
  title="Fichier à insérer"
  canUpload={canUploadMedia}
  onSelect={onFileChosen}
/>

<MediaPicker
  bind:open={inlineImagePickerOpen}
  {media}
  kind="image"
  title="Image à insérer dans le texte"
  canUpload={canUploadMedia}
  onSelect={onInlineImageChosen}
/>
