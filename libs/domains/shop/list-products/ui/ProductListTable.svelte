<script lang="ts">
  import { Edit, Trash2, Plus, CornerDownRight, ImageIcon, Layers, Power, PowerOff } from "@lucide/svelte";
  import { Button, Badge, Amount, DropdownMenu, DataTable, DataTableToolbar, DataTableRowActions, Table, ListView, ListRow, RowActionItems, formatAmount, dockDePage, readCollapseState, writeCollapseState, type SwipeAction } from "@nba/ui";
  import { canDelete, isVariant, type Product } from './products-manager-types';

  /**
   * Le catalogue, dans l'ordre de l'API : un produit puis ses déclinaisons, en retrait.
   *
   * Un parent qui a des déclinaisons n'a ni prix ni stock à lui — ce sont les siennes
   * qui comptent — : sa ligne dit combien il en a. La vignette n'apparaît que sur lui.
   */
  let {
    filteredProducts = [],
    searchTerm = $bindable(''),
    canWrite = false,
    imageUrl,
    onStartEdit,
    onAddVariant,
    onSetActive,
    onDelete,
    onOpenAdd
  }: {
    filteredProducts?: Product[];
    searchTerm?: string;
    canWrite?: boolean;
    imageUrl: (key: string | null | undefined) => string | null;
    onStartEdit: (p: Product) => void;
    onAddVariant: (p: Product) => void;
    onSetActive: (p: Product, active: boolean) => void;
    onDelete: (p: Product) => void;
    onOpenAdd?: () => void;
  } = $props();

  const hasVariants = (p: Product) => (p.variantCount ?? 0) > 0;

  /**
   * L'action principale descend dans la barre du bas, à portée du pouce. Le bouton
   * du haut reste pour la souris ; sur téléphone il ferait doublon.
   */
  $effect(() => {
    if (!onOpenAdd || !canWrite) return;
    return dockDePage.declarerActions([
      { id: 'nouveau-produit', libelle: 'Nouveau produit', icone: Plus, run: onOpenAdd },
    ]);
  });

  /**
   * Le catalogue en deux niveaux : un parent, ses déclinaisons repliées.
   *
   * Replié par défaut — un parent tient alors sur une ligne, et le catalogue se lit
   * d'un coup d'œil au lieu de dérouler trois tailles par maillot. Une déclinaison
   * orpheline (son parent est sorti du filtre) remonte au premier niveau : elle ne
   * doit pas disparaître d'une recherche qu'elle satisfait.
   */
  const arbre = $derived.by(() => {
    const parents = filteredProducts.filter((p) => !isVariant(p));
    const connus = new Set(parents.map((p) => p.id));
    const enfants = new Map<number, Product[]>();
    const orphelines: Product[] = [];
    for (const p of filteredProducts) {
      if (!isVariant(p)) continue;
      const parent = p.parentId as number;
      if (!connus.has(parent)) orphelines.push(p);
      else enfants.set(parent, [...(enfants.get(parent) ?? []), p]);
    }
    return { parents, enfants, orphelines };
  });

  const cleDePli = (id: number) => `produit-declinaisons-${id}`;
  let deplies = $state<Record<number, boolean>>({});

  // Le pli survit au rechargement que provoque chaque enregistrement : sans quoi le
  // groupe qu'on vient d'ouvrir se referme sous les doigts.
  $effect(() => {
    const etat: Record<number, boolean> = {};
    for (const parent of arbre.parents) {
      if (hasVariants(parent)) etat[parent.id] = readCollapseState(cleDePli(parent.id), false);
    }
    deplies = etat;
  });

  /** Ce que la liste affiche réellement : les parents, et les enfants dépliés. */
  const lignesVisibles = $derived.by(() => {
    const out: { produit: Product; enfant: boolean }[] = [];
    for (const parent of arbre.parents) {
      out.push({ produit: parent, enfant: false });
      if (deplies[parent.id]) {
        for (const enfant of arbre.enfants.get(parent.id) ?? []) out.push({ produit: enfant, enfant: true });
      }
    }
    for (const orpheline of arbre.orphelines) out.push({ produit: orpheline, enfant: false });
    return out;
  });

  function basculerPli(parent: Product) {
    const ouvert = !deplies[parent.id];
    deplies = { ...deplies, [parent.id]: ouvert };
    writeCollapseState(cleDePli(parent.id), ouvert);
  }

  /**
   * Les actions révélées par un balayage, déclarées en données.
   *
   * « Modifier » n'y figure pas : c'est déjà ce que fait l'appui sur la ligne, et
   * un geste qui refait ce qu'un appui fait déjà n'apprend rien. Le balayage sert
   * ce qu'on ne peut pas atteindre autrement sans ouvrir un menu.
   *
   * L'ordre compte : la première action touche le bord de l'écran et c'est elle
   * qu'un balayage long exécute. On y met la bascule d'activation, réversible —
   * un geste ample est trop facile à déclencher par mégarde pour qu'il porte
   * l'irréversible, que la confirmation garde de toute façon en second rideau.
   *
   * Le menu de la table et celui de la liste rendent le même tableau par
   * `RowActionItems` : une seule déclaration, trois chemins d'accès.
   */
  function actionsBalayage(p: Product): SwipeAction<Product>[] {
    const liste: SwipeAction<Product>[] = [
      p.active
        ? { id: 'desactiver', label: 'Désactiver', icon: PowerOff, tone: 'primary', run: (x) => onSetActive(x, false) }
        : { id: 'activer', label: 'Activer', icon: Power, tone: 'primary', run: (x) => onSetActive(x, true) },
    ];
    if (canDelete(p)) {
      liste.push({
        id: 'supprimer',
        label: 'Supprimer',
        icon: Trash2,
        tone: 'destructive',
        confirm: `Supprimer « ${isVariant(p) ? p.variantLabel : p.name} » ? Cette action est sans retour.`,
        run: (x) => onDelete(x),
      });
    }
    return liste;
  }

  /**
   * Projection d'un article en ligne de liste.
   *
   * Le prix est la valeur qui compte : c'est lui qui va à droite. La catégorie et le
   * nombre de déclinaisons tiennent sur le sous-titre, le stock sous le prix, et tout
   * le reste — modifier, activer, supprimer — vit dans le menu d'actions.
   *
   * Le statut ne garde pas son bouton de bascule : imbriqué dans la zone cliquable de
   * la ligne, il en ferait un élément interactif dans un autre. Un article actif est la
   * norme et ne s'annonce pas ; seul « Inactif » se signale, et la bascule passe par le
   * menu, où elle existait déjà.
   */
  function ligne(p: Product) {
    const variante = isVariant(p);
    const decline = hasVariants(p);
    const categorie = p.categoryLabel ?? 'Autre';
    const nb = p.variantCount ?? 0;
    return {
      titre: variante ? (p.variantLabel ?? '') : p.name,
      sousTitre: variante
        ? undefined
        : decline
          ? `${categorie} · ${nb} déclinaison${nb === 1 ? '' : 's'}`
          : categorie,
      valeur: decline ? 'selon déclinaison' : formatAmount(p.priceCents ?? p.price),
      ton: decline ? ('muted' as const) : ('foreground' as const),
      legende: !decline && p.trackStock ? `Stock ${p.stock}` : undefined,
    };
  }
</script>

{#snippet thumbnail(product: Product, size: string)}
  {@const src = imageUrl(product.imageKey)}
  <div class="{size} shrink-0 overflow-hidden rounded-md border border-border bg-muted/30 flex items-center justify-center">
    {#if src}
      <img {src} alt="" loading="lazy" class="h-full w-full object-contain" />
    {:else}
      <ImageIcon class="h-4 w-4 text-muted-foreground/60" />
    {/if}
  </div>
{/snippet}

{#snippet status(product: Product)}
  <Button
    variant="ghost"
    disabled={!canWrite}
    onclick={() => onSetActive(product, !product.active)}
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors border border-transparent hover:border-border cursor-pointer bg-transparent h-auto"
    title={canWrite ? 'Cliquer pour changer le statut' : undefined}
  >
    {#if product.active}
      <span class="h-2 w-2 rounded-full bg-success"></span>
      <span class="text-success">Actif</span>
    {:else}
      <span class="h-2 w-2 rounded-full bg-muted-foreground"></span>
      <span class="text-muted-foreground">Inactif</span>
    {/if}
  </Button>
{/snippet}

{#snippet actionsPropres(product: Product)}
  <DropdownMenu.Item onclick={() => onStartEdit(product)} class="cursor-pointer">
    <Edit class="w-3.5 h-3.5 mr-2" /> Modifier
  </DropdownMenu.Item>
  {#if !isVariant(product)}
    <DropdownMenu.Item onclick={() => onAddVariant(product)} class="cursor-pointer">
      <Layers class="w-3.5 h-3.5 mr-2" /> Ajouter une déclinaison
    </DropdownMenu.Item>
  {/if}
{/snippet}

{#snippet menuComplet(product: Product)}
  <DropdownMenu.Label>Actions</DropdownMenu.Label>
  {@render actionsPropres(product)}
  <DropdownMenu.Separator />
  <RowActionItems actions={actionsBalayage(product)} item={product} />
{/snippet}

<DataTable
  data={filteredProducts}
  mobileSpacing="list"
  emptyTitle="Aucun article"
  emptyDescription="Aucun article trouvé."
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher un article…"
      dockSearch
      hasFilters={false}
    >
      {#snippet actions()}
        {#if onOpenAdd && canWrite}
          <Button onclick={onOpenAdd} class="hidden md:flex font-bold items-center justify-center gap-1.5 shrink-0 h-9">
            <Plus class="w-4 h-4" />
            <span>Nouveau produit</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    <ListView
      items={lignesVisibles}
      emptyTitle="Aucun article"
      emptyDescription="Aucun article trouvé."
    >
      {#snippet listRow(entree)}
        {@const product = entree.produit}
        {@const l = ligne(product)}
        {@const declinable = !entree.enfant && hasVariants(product)}
        <ListRow
          item={product}
          onclick={canWrite ? () => onStartEdit(product) : undefined}
          title={l.titre}
          subtitle={l.sousTitre}
          value={l.valeur}
          valueTone={l.ton}
          valueCaption={l.legende}
          swipe={canWrite ? actionsBalayage(product) : []}
          actions={canWrite ? actionsPropres : undefined}
          nested={entree.enfant}
          disclosure={entree.enfant ? undefined : declinable ? (deplies[product.id] ? 'expanded' : 'collapsed') : 'none'}
          onDisclosure={() => basculerPli(product)}
        >
          {#snippet leading()}
            {#if !entree.enfant}
              {@render thumbnail(product, 'h-9 w-9')}
            {/if}
          {/snippet}
          <!--
            Le snippet se déclare toujours : un `{#snippet}` sous un `{#if}` ne serait
            pas passé en propriété au composant. C'est son contenu qui est conditionnel.
          -->
          {#snippet badge()}
            {#if !product.active}
              <Badge variant="outline" size="xs">Inactif</Badge>
            {/if}
          {/snippet}
        </ListRow>
      {/snippet}
    </ListView>
  {/snippet}

  {#snippet header()}
    <Table.Head>Article</Table.Head>
    <Table.Head>Catégorie</Table.Head>
    <Table.Head>Prix</Table.Head>
    <Table.Head>Stock</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(product)}
    <Table.Row>
      <Table.Cell class="font-medium">
        {#if isVariant(product)}
          <div class="flex items-center gap-2 pl-6 text-foreground">
            <CornerDownRight class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{product.variantLabel}</span>
          </div>
        {:else}
          <div class="flex items-center gap-3">
            {@render thumbnail(product, 'h-10 w-10')}
            <div class="min-w-0">
              <div class="truncate">{product.name}</div>
              {#if hasVariants(product)}
                <div class="text-xs text-muted-foreground">{product.variantCount} déclinaison{product.variantCount === 1 ? '' : 's'}</div>
              {/if}
            </div>
          </div>
        {/if}
      </Table.Cell>
      <Table.Cell>
        {#if !isVariant(product)}
          <Badge variant="primary-soft">{product.categoryLabel ?? 'Autre'}</Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="font-bold text-foreground">
        {#if !hasVariants(product)}
          <Amount cents={product.priceCents ?? product.price} />
        {:else}
          <span class="text-muted-foreground text-xs italic font-normal">selon déclinaison</span>
        {/if}
      </Table.Cell>
      <Table.Cell>
        {#if hasVariants(product)}
          <span class="text-muted-foreground text-xs italic">-</span>
        {:else if product.trackStock}
          <Badge variant={product.stock > 0 ? "outline" : "destructive"}>{product.stock}</Badge>
        {:else}
          <span class="text-muted-foreground text-xs italic">-</span>
        {/if}
      </Table.Cell>
      <Table.Cell>{@render status(product)}</Table.Cell>
      <Table.Cell class="text-right relative">
        {#if canWrite}
          <DataTableRowActions>{@render menuComplet(product)}</DataTableRowActions>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
