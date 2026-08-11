<script lang="ts" module>
  export type { PickableMedia } from './media-types';
</script>

<script lang="ts">
  import { Sheet, Input, Button, EmptyState, ErrorAlert, Label } from '@nba/ui';
  import { mediaUrl } from '../../media-url';
  import { ImageOff, Search, Upload } from '@lucide/svelte';
  import { humanSize } from './media-upload';
  import { uploadFile } from './media-actions';
  import { rememberUpload, recentUploads } from './media-pick.svelte';

  /**
   * Choix visuel d'un média dans la médiathèque.
   *
   * Écrit une fois pour trois usages qui demandaient tous la même chose : la couverture
   * d'une actualité, la bannière d'une grille de boutons, et l'insertion d'un document
   * dans un texte riche. C'est aussi ce qui remplace la saisie d'un identifiant
   * numérique à la main — le bloc « document » demandait « Numéro du document dans la
   * médiathèque », ce que personne ne connaît par cœur.
   *
   * Le composant ne **lit** rien : la médiathèque est déjà rendue par la page qui
   * l'accueille, et la relire ici doublerait la requête. Il sait en revanche déposer,
   * et c'est tout l'intérêt : aller chercher un fichier dans la médiathèque obligeait à
   * quitter le formulaire, donc à perdre le brouillon en cours.
   */
  let {
    open = $bindable(false),
    media = [],
    kind = 'all',
    title = 'Choisir un média',
    canUpload = false,
    onSelect
  }: {
    open: boolean;
    media: PickableMedia[];
    /** Restreint la liste : une couverture veut une image, un lien de téléchargement un document. */
    kind?: 'all' | 'image' | 'document';
    title?: string;
    /**
     * Autorise le dépôt sur place.
     *
     * Droit distinct de celui d'écrire une actualité ou une page : `cms:media:write`.
     * Sans lui, la zone de dépôt reste masquée — l'afficher enverrait l'utilisateur
     * dans un refus du serveur après avoir choisi son fichier.
     */
    canUpload?: boolean;
    onSelect: (media: PickableMedia) => void;
  } = $props();

  let searchTerm = $state('');

  const isImage = (mime: string) => mime.startsWith('image/');

  /**
   * Ce que la page a chargé, précédé de ce qui vient d'être déposé.
   *
   * Les dépôts d'abord : on vient de les faire, c'est là qu'on les cherche.
   */
  const available = $derived([
    ...recentUploads().filter((item) => !media.some((row) => row.id === item.id)),
    ...media
  ]);

  const shown = $derived(
    available
      .filter((item) => {
        if (kind === 'image') return isImage(item.mimeType);
        if (kind === 'document') return !isImage(item.mimeType);
        return true;
      })
      .filter((item) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return item.alt.toLowerCase().includes(term) || item.key.toLowerCase().includes(term);
      })
  );

  function choose(item: PickableMedia) {
    onSelect(item);
    open = false;
    searchTerm = '';
    resetUpload();
  }

  // --- Dépôt sur place -------------------------------------------------------

  /**
   * Identifiants propres à l'instance.
   *
   * Un même écran monte plusieurs sélecteurs — couverture, image dans le texte, fichier
   * à télécharger, et un jeu par bloc de la page. Des `id` figés se retrouveraient en
   * double dans le document, et un `<label for>` désignerait le champ d'un autre panneau.
   */
  const uid = $props.id();

  let uploadOpen = $state(false);
  let file = $state<File | null>(null);
  let alt = $state('');
  let uploading = $state(false);
  let uploadError = $state('');

  /** Types proposés au fichier, accordés à ce que le sélecteur sait rendre. */
  const accept = $derived(
    kind === 'image' ? 'image/*' : kind === 'document' ? 'application/pdf' : 'image/*,application/pdf'
  );

  function resetUpload() {
    uploadOpen = false;
    file = null;
    alt = '';
    uploadError = '';
  }

  function pick(event: Event) {
    file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
    uploadError = '';
  }

  /**
   * Dépose, puis choisit dans la foulée.
   *
   * Volontairement **sans** `submitForm` : ce déroulé commun se termine par
   * `flashAndReload`, qui rechargerait la page — et emporterait l'actualité ou la page
   * en cours de rédaction, c'est-à-dire tout ce que ce dépôt sur place cherche à
   * préserver. La restitution des erreurs se fait donc ici, dans le panneau.
   */
  async function submitUpload(event: Event) {
    event.preventDefault();
    const picked = file;
    if (!picked) {
      uploadError = 'Choisissez un fichier à déposer.';
      return;
    }
    // Même exigence qu'à la médiathèque : le texte alternatif se demande au dépôt,
    // parce que personne ne revient le remplir ensuite.
    if (isImage(picked.type) && alt.trim() === '') {
      uploadError = "Décrivez l'image en quelques mots, ou indiquez qu'elle est décorative.";
      return;
    }

    uploading = true;
    uploadError = '';
    try {
      const created = await uploadFile(picked, alt.trim());
      rememberUpload(created);
      choose(created);
    } catch (error) {
      uploadError = error instanceof Error ? error.message : 'Le dépôt a échoué.';
    }
    uploading = false;
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content size="xl" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title>{title}</Sheet.Title>
      <Sheet.Description>
        {kind === 'document'
          ? 'Les documents déposés dans la médiathèque.'
          : kind === 'image'
            ? 'Les images déposées dans la médiathèque.'
            : 'Tous les fichiers de la médiathèque.'}
      </Sheet.Description>
    </Sheet.Header>

    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Input
          type="text"
          bind:value={searchTerm}
          placeholder="Rechercher par description ou nom de fichier..."
          class="!pl-9"
        />
        <Search class="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
      </div>
      {#if canUpload}
        <Button
          type="button"
          variant={uploadOpen ? 'secondary' : 'outline'}
          class="shrink-0 gap-1.5"
          aria-expanded={uploadOpen}
          onclick={() => {
            uploadOpen = !uploadOpen;
            uploadError = '';
          }}
        >
          <Upload class="h-4 w-4" />
          Déposer un fichier
        </Button>
      {/if}
    </div>

    {#if canUpload && uploadOpen}
      <!--
        Formulaire imbriqué dans le panneau, et non un second sheet par-dessus : le
        formulaire hôte est déjà ouvert dessous, et empiler une troisième couche
        rendrait la sortie confuse.
      -->
      <form class="border-border space-y-3 rounded-lg border p-3" onsubmit={submitUpload}>
        {#if uploadError}
          <ErrorAlert message={uploadError} />
        {/if}

        <div class="space-y-1.5">
          <Label for="{uid}-file">Fichier</Label>
          <Input id="{uid}-file" type="file" {accept} onchange={pick} disabled={uploading} />
        </div>

        {#if !file || isImage(file.type)}
          <div class="space-y-1.5">
            <Label for="{uid}-alt">Texte alternatif</Label>
            <Input
              id="{uid}-alt"
              bind:value={alt}
              placeholder="Ce que montre l'image"
              disabled={uploading}
            />
          </div>
        {/if}

        <div class="flex items-center justify-between gap-2">
          <p class="text-muted-foreground text-xs">
            Les images sont réduites à 1600 px et converties en WebP avant l'envoi.
          </p>
          <Button type="submit" size="sm" class="shrink-0 gap-1.5" disabled={uploading}>
            <Upload class="h-4 w-4" />
            {uploading ? 'Envoi…' : 'Déposer et choisir'}
          </Button>
        </div>
      </form>
    {/if}

    {#if shown.length === 0}
      <EmptyState
        icon={ImageOff}
        title="Aucun média"
        description={searchTerm.trim()
          ? 'Aucun média ne correspond à votre recherche.'
          : canUpload
            ? 'Déposez un fichier pour commencer.'
            : 'Déposez d’abord un fichier depuis la médiathèque.'}
      />
    {:else}
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each shown as item (item.id)}
          <li>
            <button
              type="button"
              onclick={() => choose(item)}
              class="border-border hover:border-primary focus-visible:ring-ring block w-full overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span class="bg-muted flex aspect-video items-center justify-center overflow-hidden">
                {#if isImage(item.mimeType)}
                  <img
                    src={mediaUrl(item.key)}
                    alt={item.alt}
                    loading="lazy"
                    class="h-full w-full object-cover"
                  />
                {:else}
                  <span class="text-3xl" aria-hidden="true">📄</span>
                {/if}
              </span>
              <span class="block p-2">
                <span class="block truncate text-sm font-medium">{item.alt || '(sans description)'}</span>
                <span class="text-muted-foreground block text-xs">{humanSize(item.sizeBytes)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="flex justify-end pt-2">
      <Button type="button" variant="outline" onclick={() => (open = false)}>Annuler</Button>
    </div>
  </Sheet.Content>
</Sheet.Root>
