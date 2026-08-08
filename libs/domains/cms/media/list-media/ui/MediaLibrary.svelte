<script lang="ts">
  import { Button, Input, Label, EmptyState, toast, uiConfirm } from '@nba/ui';
  import { uploadFile, deleteMedia } from './media-actions';
  import { humanSize } from './media-upload';
  import { flashAndReload } from '@nba/ui';

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

  const publicUrl = (key: string) => `/media/${key.replace(/^media\//, '')}`;
  const isImage = (mime: string) => mime.startsWith('image/');

  function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!file || busy) return;

    // Le texte alternatif conditionne l'accessibilité et la recherche d'images ; il
    // est demandé au dépôt parce que personne ne revient le remplir ensuite.
    if (isImage(file.type) && alt.trim() === '') {
      toast.error("Décrivez l'image en quelques mots, ou indiquez qu'elle est décorative.");
      return;
    }

    busy = true;
    try {
      await uploadFile(file, alt.trim());
      flashAndReload('Média ajouté.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Le dépôt a échoué.');
      busy = false;
    }
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

{#if canWrite}
  <form class="border-border mb-6 rounded-lg border p-4" onsubmit={submit}>
    <div class="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      <div>
        <Label for="media-file">Fichier</Label>
        <Input id="media-file" type="file" accept="image/*,application/pdf" onchange={pick} />
      </div>
      <div>
        <Label for="media-alt">Texte alternatif</Label>
        <Input id="media-alt" bind:value={alt} placeholder="Ce que montre l'image" />
      </div>
      <Button type="submit" disabled={!file || busy}>{busy ? 'Envoi…' : 'Ajouter'}</Button>
    </div>
    <p class="text-muted-foreground mt-2 text-xs">
      Les images sont réduites à 1600 px et converties en WebP dans le navigateur avant l'envoi.
    </p>
  </form>
{/if}

{#if media.length === 0}
  <EmptyState
    title="Aucun média"
    description="Déposez une image ou un document pour commencer."
  />
{:else}
  <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {#each media as row (row.id)}
      <li class="border-border overflow-hidden rounded-lg border">
        <div class="bg-muted flex aspect-video items-center justify-center overflow-hidden">
          {#if isImage(row.mimeType)}
            <img
              src={publicUrl(row.key)}
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
          <p class="truncate font-medium">{row.alt || '(sans description)'}</p>
          <p class="text-muted-foreground text-xs">
            {humanSize(row.sizeBytes)}{#if row.width} · {row.width}×{row.height}{/if}
          </p>
          <div class="flex items-center gap-2 pt-1">
            <a href={publicUrl(row.key)} target="_blank" rel="noopener noreferrer" class="text-primary text-xs hover:underline">
              Ouvrir
            </a>
            {#if canDelete}
              <button type="button" class="text-destructive text-xs hover:underline" onclick={() => remove(row)}>
                Supprimer
              </button>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}
