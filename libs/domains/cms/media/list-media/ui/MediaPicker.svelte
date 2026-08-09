<script lang="ts" module>
  export type { PickableMedia } from './media-types';
</script>

<script lang="ts">
  import { Sheet, Input, Button, EmptyState } from '@nba/ui';
  import { mediaUrl } from '../../media-url';
  import { ImageOff, Search } from '@lucide/svelte';
  import { humanSize } from './media-upload';

  /**
   * Choix visuel d'un média dans la médiathèque.
   *
   * Écrit une fois pour trois usages qui demandaient tous la même chose : la couverture
   * d'une actualité, la bannière d'une grille de boutons, et l'insertion d'un document
   * dans un texte riche. C'est aussi ce qui remplace la saisie d'un identifiant
   * numérique à la main — le bloc « document » demandait « Numéro du document dans la
   * médiathèque », ce que personne ne connaît par cœur.
   *
   * Le composant ne charge rien : la médiathèque est déjà rendue par la page qui
   * l'accueille, et la relire ici doublerait la requête.
   */
  let {
    open = $bindable(false),
    media = [],
    kind = 'all',
    title = 'Choisir un média',
    onSelect
  }: {
    open: boolean;
    media: PickableMedia[];
    /** Restreint la liste : une couverture veut une image, un lien de téléchargement un document. */
    kind?: 'all' | 'image' | 'document';
    title?: string;
    onSelect: (media: PickableMedia) => void;
  } = $props();

  let searchTerm = $state('');

  const isImage = (mime: string) => mime.startsWith('image/');

  const shown = $derived(
    media
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

    <div class="relative">
      <Input
        type="text"
        bind:value={searchTerm}
        placeholder="Rechercher par description ou nom de fichier..."
        class="!pl-9"
      />
      <Search class="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
    </div>

    {#if shown.length === 0}
      <EmptyState
        icon={ImageOff}
        title="Aucun média"
        description={searchTerm.trim()
          ? 'Aucun média ne correspond à votre recherche.'
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
