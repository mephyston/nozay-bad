<script lang="ts">
  import {
    Button,
    Input,
    Label,
    Select,
    Badge,
    CollapsibleSection,
    EmptyState,
    toast,
    uiConfirm,
    flashAndReload
  } from '@nba/ui';
  import type { BlockPayload } from '../../../shared/blocks';
  import { BLOCK_KINDS } from './block-editor-registry';
  import BlockCard from './BlockCard.svelte';
  import RevisionsPanel from './RevisionsPanel.svelte';
  import { saveBlocks, saveMeta, setPublished } from './page-editor-actions';

  interface PageRow {
    id: number;
    title: string;
    slug: string;
    path: string;
    template: 'default' | 'home' | 'landing';
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
    media = [],
    targets = [],
    categories = [],
    redirects = [],
    canWrite = false,
    canDelete = false,
    canUploadMedia = false
  } = $props<{
    page: PageRow;
    blocks: BlockPayload[];
    revisions: unknown[];
    previewUrl?: string;
    /** Médiathèque, cibles de liens et catégories : ressources communes aux éditeurs de blocs. */
    media?: any[];
    targets?: { path: string; title: string; kind: 'page' | 'post'; status?: 'draft' | 'published' }[];
    /** Anciennes adresses menant ici, pour l'encart des redirections. */
    redirects?: { id: number; fromPath: string; statusCode: number; hitCount: number; note: string | null }[];
    categories?: { slug: string; name: string }[];
    canWrite?: boolean;
    canDelete?: boolean;
    /** `cms:media:write` : autorise le dépôt depuis les sélecteurs des blocs. */
    canUploadMedia?: boolean;
  }>();

  // Copie locale : l'éditeur travaille sur son propre état et n'envoie qu'à
  // l'enregistrement. L'écriture est un remplacement intégral côté serveur.
  let blocks = $state<BlockPayload[]>(structuredClone($state.snapshot(initialBlocks)));
  let title = $state(page.title);
  let slug = $state(page.slug);
  let template = $state<'default' | 'home' | 'landing'>(page.template);
  let seoTitle = $state(page.seoTitle ?? '');
  let seoDescription = $state(page.seoDescription ?? '');

  /**
   * Adresse telle qu'elle sera après enregistrement.
   *
   * Recalculée ici pour que l'auteur voie l'effet de sa saisie avant de valider : le
   * gabarit « accueil » impose la racine et neutralise le slug, et le chemin du parent
   * est repris de l'adresse actuelle.
   */
  const parentPath = $derived(page.path.slice(0, page.path.length - `${page.slug}/`.length) || '/');
  const nextPath = $derived(template === 'home' ? '/' : `${parentPath}${slug}/`);
  const pathChanges = $derived(nextPath !== page.path);
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
      await saveMeta({ title, slug, template, seoTitle, seoDescription });
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
        <!--
          Deux valeurs seulement, et non les trois du schéma : `landing` n'est lu par
          aucun code de rendu — le site compose une page à partir de ses blocs, jamais
          de son gabarit. L'offrir donnerait un choix sans effet.
        -->
        <Label for="page-template">Rôle de la page</Label>
        <Select
          id="page-template"
          value={template}
          onchange={(e) => {
            template = (e.currentTarget as HTMLSelectElement).value as 'default' | 'home' | 'landing';
            touch();
          }}
        >
          <option value="default">Page normale</option>
          <option value="home">Page d'accueil — servie à la racine « / »</option>
        </Select>
      </div>
      <div class="sm:col-span-2">
        <Label for="page-slug">Adresse</Label>
        <Input
          id="page-slug"
          bind:value={slug}
          oninput={touch}
          disabled={template === 'home'}
          placeholder="presentation"
        />
        <p class="text-muted-foreground mt-1 text-xs">
          {#if template === 'home'}
            La page d'accueil est servie à <code class="text-foreground">/</code> ; son adresse
            reste enregistrée et lui sera rendue si une autre page reprend l'accueil.
          {:else}
            Adresse : <code class="text-foreground">{nextPath}</code>
            {#if pathChanges}
              — l'ancienne <code class="text-foreground">{page.path}</code> redirigera
              automatiquement (301) vers la nouvelle, elle et ses sous-pages.
            {/if}
          {/if}
        </p>
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

  {#if redirects.length > 0}
    <!--
      Repliée par défaut : c'est une information de contrôle, consultée le jour où l'on
      se demande si une ancienne adresse sert encore. Dépliée en permanence, elle
      poussait les blocs — le vrai travail de cet écran — d'autant plus bas que la page
      traînait d'anciennes adresses derrière elle. Le compteur reste visible replié,
      ce qui suffit à savoir s'il y a quelque chose à regarder.
    -->
    <CollapsibleSection
      title="Anciennes adresses"
      description="Elles redirigent vers cette page. Le compteur dit combien de visiteurs les ont empruntées : une redirection encore utilisée ne doit pas être retirée."
      badge={redirects.length}
    >
      <ul class="space-y-1.5">
        {#each redirects as redirect (redirect.id)}
          <li class="flex flex-wrap items-center gap-2 text-xs">
            <code class="text-foreground">{redirect.fromPath}</code>
            <span class="text-muted-foreground" aria-hidden="true">→</span>
            <Badge variant="outline" size="xs">{redirect.statusCode}</Badge>
            <span class="text-muted-foreground">
              {redirect.hitCount === 0
                ? 'jamais empruntée'
                : `${redirect.hitCount} visite${redirect.hitCount > 1 ? 's' : ''}`}
            </span>
          </li>
        {/each}
      </ul>
    </CollapsibleSection>
  {/if}

  {#if blocks.length === 0}
    <EmptyState title="Page vide" description="Ajoutez un bloc pour commencer." />
  {:else}
    <div class="space-y-3">
      {#each blocks as block, index (index)}
        <BlockCard
          bind:block={blocks[index]}
          {index}
          total={blocks.length}
          {media}
          {canUploadMedia}
          {targets}
          {categories}
          onMove={move}
          onRemove={removeBlock}
        />
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
