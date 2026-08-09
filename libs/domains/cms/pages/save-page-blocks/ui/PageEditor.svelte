<script lang="ts">
  import { Button, Input, Label, Badge, EmptyState, toast, uiConfirm, flashAndReload } from '@nba/ui';
  import type { BlockPayload } from '../../../shared/blocks';
  import { BLOCK_KINDS } from './block-editor-registry';
  import BlockCard from './BlockCard.svelte';
  import RevisionsPanel from './RevisionsPanel.svelte';
  import { saveBlocks, saveMeta, setPublished } from './page-editor-actions';

  interface PageRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    seoTitle: string | null;
    seoDescription: string | null;
    noindex: boolean;
  }

  let {
    page,
    blocks: initialBlocks = [],
    revisions = [],
    previewUrl = '',
    canWrite = false,
    canDelete = false
  } = $props<{
    page: PageRow;
    blocks: BlockPayload[];
    revisions: unknown[];
    previewUrl?: string;
    canWrite?: boolean;
    canDelete?: boolean;
  }>();

  // Copie locale : l'éditeur travaille sur son propre état et n'envoie qu'à
  // l'enregistrement. L'écriture est un remplacement intégral côté serveur.
  let blocks = $state<BlockPayload[]>(structuredClone($state.snapshot(initialBlocks)));
  let title = $state(page.title);
  let seoTitle = $state(page.seoTitle ?? '');
  let seoDescription = $state(page.seoDescription ?? '');
  let busy = $state(false);
  let dirty = $state(false);

  function touch() {
    dirty = true;
  }

  function addBlock(index: number) {
    blocks = [...blocks, BLOCK_KINDS[index].create()];
    touch();
  }

  function move(from: number, to: number) {
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    blocks = next;
    touch();
  }

  async function removeBlock(index: number) {
    const confirmed = await uiConfirm({
      title: 'Retirer ce bloc ?',
      description: 'Son contenu sera perdu au prochain enregistrement.',
      confirmLabel: 'Retirer',
      destructive: true
    });
    if (!confirmed) return;
    blocks = blocks.filter((_, i) => i !== index);
    touch();
  }

  async function save() {
    if (busy) return;
    busy = true;
    try {
      await saveMeta({ title, seoTitle, seoDescription });
      await saveBlocks($state.snapshot(blocks) as BlockPayload[]);
      flashAndReload('Page enregistrée.');
    } catch (error) {
      // Le formulaire reste ouvert avec les valeurs saisies : un refus ne doit jamais
      // faire perdre le travail en cours.
      toast.error(error instanceof Error ? error.message : "L'enregistrement a échoué.");
      busy = false;
    }
  }

  async function togglePublished() {
    const next = page.status !== 'published';
    if (next && dirty) {
      toast.error('Enregistrez vos modifications avant de publier.');
      return;
    }
    busy = true;
    try {
      await setPublished(next);
      flashAndReload(next ? 'Page publiée.' : 'Page retirée du site.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
      busy = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center gap-3">
    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
      {page.status === 'published' ? 'En ligne' : 'Brouillon'}
    </Badge>
    <code class="text-muted-foreground text-sm">{page.path}</code>
    {#if previewUrl}
      <a href={previewUrl} target="_blank" rel="noopener noreferrer" class="text-primary text-sm hover:underline">
        Aperçu
      </a>
    {/if}
    {#if dirty}
      <span class="text-muted-foreground text-sm">Modifications non enregistrées</span>
    {/if}
  </div>

  {#if canWrite}
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <Label for="page-title">Titre</Label>
        <Input id="page-title" bind:value={title} oninput={touch} />
      </div>
      <div>
        <Label for="page-seo-title">Titre pour les moteurs</Label>
        <Input id="page-seo-title" bind:value={seoTitle} oninput={touch} placeholder="Repris du titre si vide" />
      </div>
      <div class="sm:col-span-2">
        <Label for="page-seo-description">Description pour les moteurs</Label>
        <Input
          id="page-seo-description"
          bind:value={seoDescription}
          oninput={touch}
          placeholder="Une phrase de 150 caractères, affichée dans les résultats de recherche"
        />
        <p class="text-muted-foreground mt-1 text-xs">
          {seoDescription.length}/155 — à défaut, le début de la page sera utilisé.
        </p>
      </div>
    </div>
  {/if}

  {#if blocks.length === 0}
    <EmptyState title="Page vide" description="Ajoutez un bloc pour commencer." />
  {:else}
    <div class="space-y-3">
      {#each blocks as block, index (index)}
        <BlockCard bind:block={blocks[index]} {index} total={blocks.length} onMove={move} onRemove={removeBlock} />
      {/each}
    </div>
  {/if}

  {#if canWrite}
    <div class="border-border rounded-lg border p-3">
      <p class="mb-2 text-sm font-medium">Ajouter un bloc</p>
      <div class="flex flex-wrap gap-2">
        {#each BLOCK_KINDS as kind, index (kind.type)}
          <Button variant="secondary" size="sm" title={kind.hint} onclick={() => addBlock(index)}>
            {kind.label}
          </Button>
        {/each}
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button onclick={save} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      <Button variant="secondary" onclick={togglePublished} disabled={busy}>
        {page.status === 'published' ? 'Retirer du site' : 'Publier'}
      </Button>
    </div>
  {/if}

  <RevisionsPanel {revisions} canRestore={canWrite} />
</div>
