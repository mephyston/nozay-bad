<script lang="ts">
  import {
    Button,
    Input,
    Badge,
    ChoiceField,
    FormField,
    EmptyState,
    ChoicePicker,
    ListRow,
    ListView,
    ResponsiveSheet,
    dockDePage,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { Check, Ellipsis, GripVertical, History, Plus, Signpost } from '@lucide/svelte';
  import { detailDeBloc, genreDeBloc } from './block-summary';
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
    previewSigne = true,
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
    /**
     * Le lien d'aperçu porte-t-il un jeton signé ?
     *
     * Sans `PREVIEW_TOKEN_SECRET` côté administration, il n'en porte pas — et le site
     * public traite alors la visite comme n'importe quelle autre, donc **404 sur un
     * brouillon**. Une page déjà en ligne s'affiche de toute façon.
     */
    previewSigne?: boolean;
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

  /*
    Le mode réorganisation, comme pour les menus : les blocs s'y **replient** en une
    rangée chacun. Ouverts, on déplace une carte de six cents pixels sans jamais voir
    où elle atterrit ; repliés, la page entière tient à l'écran et le trajet se lit.
  */
  let reorganise = $state(false);
  let choixDeBloc = $state(false);
  let historiqueOuvert = $state(false);
  let adressesOuvertes = $state(false);

  /** Déplace un bloc du rang `de` au rang `vers` — le glissement en franchit plusieurs. */
  function deplacerBloc(_groupe: string, de: number, vers: number) {
    if (de === vers || vers < 0 || vers >= blocks.length) return;
    const suite = [...blocks];
    const [deplace] = suite.splice(de, 1);
    suite.splice(vers, 0, deplace);
    blocks = suite;
    touch();
  }

  /** Ajoute le genre de bloc choisi. Le catalogue est indexé, la liste rend un type. */
  function ajouterLeGenre(type: string) {
    const rang = BLOCK_KINDS.findIndex((k) => k.type === type);
    if (rang >= 0) addBlock(rang);
  }

  /*
    Les gestes de consultation et de rangement descendent dans la barre du bas. Ils
    vivaient en bas de page : l'historique et les anciennes adresses n'étaient
    atteints qu'après avoir défilé tous les blocs, et on ne les y cherchait donc pas.
  */
  $effect(() => {
    const actions: SwipeAction[] = [];
    if (canWrite && !reorganise) {
      actions.push({
        id: 'ajouter',
        label: 'Ajouter un bloc',
        icon: Plus,
        tone: 'primary',
        run: () => (choixDeBloc = true)
      });
    }
    if (canWrite && blocks.length > 1) {
      actions.push({
        id: 'ranger',
        label: reorganise ? 'Terminer le rangement' : 'Réorganiser les blocs',
        icon: reorganise ? Check : GripVertical,
        tone: 'primary',
        run: () => (reorganise = !reorganise)
      });
    }
    actions.push({
      id: 'historique',
      label: 'Historique',
      icon: History,
      run: () => (historiqueOuvert = true)
    });
    if (redirects.length > 0) {
      actions.push({
        id: 'adresses',
        label: 'Anciennes adresses',
        icon: Signpost,
        run: () => (adressesOuvertes = true)
      });
    }
    return dockDePage.declarerActions(actions, { icon: Ellipsis, label: 'Actions de la page' });
  });

  async function save() {
    if (busy) return;
    busy = true;
    try {
      await saveMeta(page.id, { title, slug, template, seoTitle, seoDescription });
      await saveBlocks(page.id, $state.snapshot(blocks) as BlockPayload[]);
      flashAndReload('Page enregistrée.');
    } catch (error) {
      // Le formulaire reste ouvert avec les valeurs saisies : un refus ne doit jamais
      // faire perdre le travail en cours.
      uiAlert(error instanceof Error ? error.message : "L'enregistrement a échoué.");
      busy = false;
    }
  }

  async function togglePublished() {
    const next = page.status !== 'published';
    if (next && dirty) {
      uiAlert('Enregistrez vos modifications avant de publier.');
      return;
    }
    busy = true;
    try {
      await setPublished(page.id, next);
      flashAndReload(next ? 'Page publiée.' : 'Page retirée du site.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'opération a échoué.");
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
    {#if previewUrl && (previewSigne || page.status === 'published')}
      <a href={previewUrl} target="_blank" rel="noopener noreferrer" class="text-primary text-sm hover:underline">
        Aperçu
      </a>
    {:else if previewUrl}
      <!--
        Proposer le lien quand même donnait un 404 sans explication : le site ne montre
        un brouillon que sur présentation d'un jeton signé, et l'administration n'a pas
        de quoi le signer ici.
      -->
      <span
        class="text-muted-foreground text-sm"
        title="L'aperçu d'un brouillon exige PREVIEW_TOKEN_SECRET côté administration, avec la même valeur que le site public."
      >
        Aperçu indisponible
      </span>
    {/if}
    {#if dirty}
      <span class="text-muted-foreground text-sm">Modifications non enregistrées</span>
    {/if}
  </div>

  {#if canWrite}
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField id="page-title" label="Titre">
        <Input id="page-title" bind:value={title} oninput={touch} />
      </FormField>

      <!--
        Deux valeurs seulement, et non les trois du schéma : `landing` n'est lu par
        aucun code de rendu — le site compose une page à partir de ses blocs, jamais
        de son gabarit. L'offrir donnerait un choix sans effet.
      -->
      <FormField id="page-template" label="Rôle de la page">
        <ChoiceField
          id="page-template"
          label="Rôle de la page"
          value={template}
          onChange={(v) => {
            template = v as 'default' | 'home' | 'landing';
            touch();
          }}
          options={[
            { value: 'default', label: 'Page normale' },
            { value: 'home', label: "Page d'accueil", hint: 'Servie à la racine « / »' }
          ]}
        />
      </FormField>

      <div class="sm:col-span-2">
        <FormField id="page-slug" label="Adresse">
          <Input
            id="page-slug"
            bind:value={slug}
            oninput={touch}
            disabled={template === 'home'}
            placeholder="presentation"
          />
        </FormField>
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

      <FormField id="page-seo-title" label="Titre pour les moteurs">
        <Input id="page-seo-title" bind:value={seoTitle} oninput={touch} placeholder="Repris du titre si vide" />
      </FormField>

      <div class="sm:col-span-2">
        <FormField
          id="page-seo-description"
          label="Description pour les moteurs"
          hint={`${seoDescription.length}/155 — à défaut, le début de la page sera utilisé.`}
        >
          <Input
            id="page-seo-description"
            bind:value={seoDescription}
            oninput={touch}
            placeholder="Une phrase de 150 caractères, affichée dans les résultats de recherche"
          />
        </FormField>
      </div>
    </div>
  {/if}

  {#if blocks.length === 0}
    <EmptyState title="Page vide" description="Ajoutez un bloc pour commencer." />
  {:else if reorganise}
    <!--
      Repliés, les blocs tiennent tous à l'écran : c'est ce qui permet de voir le
      trajet d'un déplacement au lieu de le deviner. Chaque rangée dit le genre du
      bloc et ce qui le distingue de son voisin du même genre.
    -->
    <div class="space-y-3">
      <p class="px-4 text-xs text-muted-foreground">
        Tirez un bloc par sa poignée pour le déplacer. L'ordre s'applique à
        l'enregistrement, comme le reste de la page.
      </p>
      <ListView items={blocks} onReorder={deplacerBloc}>
        {#snippet listRow(bloc, index)}
          <ListRow
            item={bloc}
            reorder={{ groupe: 'blocs', rang: index }}
            title={`${index + 1}. ${genreDeBloc(bloc)}`}
            subtitle={detailDeBloc(bloc)}
          />
        {/snippet}
      </ListView>
    </div>
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

  {#if canWrite && !reorganise}
    <!--
      Une rangée de douze boutons dont la description ne vivait qu'en infobulle — donc
      nulle part au doigt. Un seul geste ouvre l'écran de choix, où chaque genre a sa
      ligne, son nom et la phrase qui dit à quoi il sert.
    -->
    <Button variant="outline" class="w-full gap-1.5" onclick={() => (choixDeBloc = true)}>
      <Plus class="size-4" />
      Ajouter un bloc
    </Button>

    <div class="flex flex-wrap items-center gap-2">
      <!--
        Réorganiser vit aussi ici : la barre du bas est masquée au-dessus de 768 px, et
        le mode y serait sinon inatteignable à la souris.
      -->
      {#if blocks.length > 1}
        <Button
          variant={reorganise ? 'default' : 'outline'}
          class="hidden gap-1.5 md:inline-flex"
          onclick={() => (reorganise = !reorganise)}
        >
          {#if reorganise}
            <Check class="size-4" />
            Terminer le rangement
          {:else}
            <GripVertical class="size-4" />
            Réorganiser
          {/if}
        </Button>
      {/if}
      <Button onclick={save} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      <Button variant="secondary" onclick={togglePublished} disabled={busy}>
        {page.status === 'published' ? 'Retirer du site' : 'Publier'}
      </Button>
    </div>
  {/if}

  <!--
    Les anciennes adresses et l'historique quittent le bas de l'écran pour des
    tiroirs, atteints depuis le menu de la barre du bas ou les boutons du haut. Ils
    étaient posés après les blocs : sur une page de dix blocs, on ne les atteignait
    qu'après un long défilement, et on ne les y cherchait donc jamais.
  -->
</div>

<ResponsiveSheet
  bind:open={adressesOuvertes}
  title="Anciennes adresses"
  description="Elles redirigent vers cette page. Une redirection encore empruntée ne doit pas être retirée."
  size="lg"
>
  <ListView items={redirects}>
    {#snippet listRow(redirect)}
      <ListRow
        item={redirect}
        title={redirect.fromPath}
        subtitle={redirect.statusCode === 410 ? 'Ne répond plus' : `→ ${page.path}`}
        value={String(redirect.hitCount)}
        valueTone={redirect.hitCount > 0 ? 'foreground' : 'muted'}
        valueCaption={redirect.hitCount === 0 ? 'jamais' : 'visites'}
        chevron="none"
      />
    {/snippet}
  </ListView>
</ResponsiveSheet>

<RevisionsPanel
  bind:open={historiqueOuvert}
  {revisions}
  pageId={page.id}
  canRestore={canWrite}
/>

<!--
  Le catalogue des blocs : douze genres, chacun avec la phrase qui dit à quoi il sert.
  Elle n'existait qu'en `title=` sur un bouton — une infobulle, donc rien au doigt.
-->
<ChoicePicker
  bind:open={choixDeBloc}
  title="Ajouter un bloc"
  description="Le bloc s'ajoute en fin de page ; le mode de rangement permet de le déplacer."
  options={BLOCK_KINDS.map((kind) => ({ value: kind.type, label: kind.label, hint: kind.hint }))}
  onChoose={ajouterLeGenre}
/>
