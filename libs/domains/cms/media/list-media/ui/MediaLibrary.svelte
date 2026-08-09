<script lang="ts">
  import { Plus, Trash2, ExternalLink, Upload } from '@lucide/svelte';
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
  import { uploadFile, deleteMedia } from './media-actions';
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
      success: 'Média ajouté.',
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
      {#each filteredMedia as row (row.id)}
        <li class="overflow-hidden rounded-lg border border-border">
          <div class="flex aspect-video items-center justify-center overflow-hidden bg-muted">
            {#if isImage(row.mimeType)}
              <img
                src={mediaUrl(row.key)}
                alt={row.alt}
                width={row.width ?? undefined}
                height={row.height ?? undefined}
                loading="lazy"
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
    <Input id="media-file" type="file" accept="image/*,application/pdf" onchange={pick} />
  </FormField>

  <FormField id="media-alt" label="Texte alternatif">
    <Input id="media-alt" bind:value={alt} placeholder="Ce que montre l'image" />
  </FormField>
</FormSheet>
