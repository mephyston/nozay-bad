<script lang="ts">
  import { Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, ImagePlus, X, Send } from '@lucide/svelte';
  import { mediaPath, mediaUrl, websiteOrigin } from '../../../media/media-url';
  import MediaPicker, { type PickableMedia } from '../../../media/list-media/ui/MediaPicker.svelte';
  import {
    Button,
    Input,
    Badge,
    Card,
    Checkbox,
    Label,
    Select,
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
    events = []
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

  function toggleCategory(id: number, checked: boolean) {
    selectedCategoryIds = checked
      ? [...selectedCategoryIds, id]
      : selectedCategoryIds.filter((value) => value !== id);
  }

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
      toast.error(error instanceof Error ? error.message : 'La diffusion a échoué.');
    }
  }

  /** Diffusable : réservée, en ligne, jamais encore envoyée, et le droit d'envoyer. */
  const canNotifyRow = (row: PostRow) =>
    canNotify && row.visibility === 'private' && row.status === 'published' && !row.notifiedAt;

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

<!--
  Un seul jeu d'actions, rendu à l'identique dans la carte mobile et dans la ligne du
  tableau. Le mobile alignait auparavant trois boutons pleine largeur qui ne tenaient
  pas sur un téléphone, et il lui manquait « Prévenir les adhérents » : le menu replié
  tient dans un coin et n'oublie rien.
-->
{#snippet actionsMenu(row: PostRow)}
  <DataTableRowActions>
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    {#if canWrite}
      <DropdownMenu.Item onclick={() => startEdit(row)} class="cursor-pointer">
        <Edit class="mr-2 h-3.5 w-3.5" />
        Modifier
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => togglePublish(row)} class="cursor-pointer">
        {#if row.status === 'published'}
          <EyeOff class="mr-2 h-3.5 w-3.5" />
          Repasser en brouillon
        {:else}
          <Eye class="mr-2 h-3.5 w-3.5" />
          Publier
        {/if}
      </DropdownMenu.Item>
    {/if}
    {#if canNotifyRow(row)}
      <DropdownMenu.Item onclick={() => notify(row)} class="cursor-pointer">
        <Send class="mr-2 h-3.5 w-3.5" />
        Prévenir les adhérents
      </DropdownMenu.Item>
    {/if}
    {#if row.status === 'published' && row.visibility === 'public'}
      <!-- Même raison que pour les pages : l'adresse est relative au site public, la
           résoudre sur le domaine de l'administration donne un « Accès refusé ». -->
      <DropdownMenu.Item
        onclick={() => window.open(`${websiteOrigin}${row.path}`, '_blank', 'noopener')}
        class="cursor-pointer"
      >
        <ExternalLink class="mr-2 h-3.5 w-3.5" />
        Voir sur le site
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
{/snippet}

<!-- Réservée / en ligne : deux informations distinctes, donc deux pastilles, sur une
     ligne qui se replie plutôt que d'élargir la colonne. -->
{#snippet statusBadges(row: PostRow, size: 'xs' | 'default')}
  <div class="flex flex-wrap items-center gap-1.5">
    {#if row.visibility === 'private'}
      <Badge variant="outline" {size}>Adhérents</Badge>
    {/if}
    <Badge variant={row.status === 'published' ? 'primary-soft' : 'outline'} {size}>
      {row.status === 'published' ? 'En ligne' : 'Brouillon'}
    </Badge>
  </div>
{/snippet}

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
        <Card.Content class="flex items-start gap-2 p-4">
          <div class="min-w-0 flex-1 space-y-1.5">
            <h4 class="text-sm font-bold leading-snug text-foreground">{row.title}</h4>
            <code class="block truncate text-xs text-muted-foreground">{row.path}</code>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {@render statusBadges(row, 'xs')}
              <span class="text-xs text-muted-foreground">{when(row.publishedAt)}</span>
            </div>
          </div>
          <div class="shrink-0">
            {@render actionsMenu(row)}
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
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
        {@render statusBadges(item, 'default')}
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

  <FormField id="post-visibility" label="Qui peut la lire">
    <div class="space-y-2">
      <label class="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="post-visibility"
          value="public"
          checked={visibility === 'public'}
          onchange={() => (visibility = 'public')}
          class="mt-1"
        />
        <span>
          <span class="font-medium">Tout le monde</span>
          <span class="text-muted-foreground block text-xs">
            Publiée sur le site public et dans l'espace adhérent.
          </span>
        </span>
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="post-visibility"
          value="private"
          checked={visibility === 'private'}
          onchange={() => (visibility = 'private')}
          class="mt-1"
        />
        <span>
          <span class="font-medium">Adhérents seulement</span>
          <span class="text-muted-foreground block text-xs">
            Visible dans l'espace adhérent uniquement. Peut être diffusée en notification
            depuis la liste, une fois publiée.
          </span>
        </span>
      </label>
    </div>
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

  <FormField id="post-event" label="Événement lié (facultatif)">
    <Select id="post-event" bind:value={eventId} disabled={events.length === 0}>
      <option value={0}>Aucun</option>
      {#each events as event (event.id)}
        <option value={event.id}>
          {event.title} — {eventWhen(event.startsAt)}{event.registration === 'open'
            ? ' · inscriptions ouvertes'
            : ''}
        </option>
      {/each}
    </Select>
    <p class="text-muted-foreground mt-1 text-xs">
      {#if events.length === 0}
        Aucun rendez-vous à venir dans l'agenda. Créez-le d'abord dans
        <a href="/admin/website/events" class="text-primary hover:underline">Agenda</a>,
        il sera alors proposé ici.
      {:else}
        L'actualité annonce alors ce rendez-vous : si ses inscriptions sont ouvertes, le
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
