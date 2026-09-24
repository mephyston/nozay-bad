<script lang="ts">
  import { History, PackageOpen } from '@lucide/svelte';
  import { Tabs } from '@nba/ui';
  import type { Member, OrderConfirmation, PaymentMethodOption, Product } from './catalog-types';
  import { familyCategories, groupFamilies, type ProductFamily } from './catalog-families';
  import type { ClubBankDetails } from './catalog-utils';
  import ShopProductCard from './ShopProductCard.svelte';
  import ShopOrderDialog from './ShopOrderDialog.svelte';
  import ShopCatalogConfirmation from './ShopCatalogConfirmation.svelte';

  /**
   * La boutique de l'espace adhérent : une vitrine, pas un formulaire.
   *
   * Le catalogue se présentait en liste déroulante, sans image, une entrée par taille
   * de maillot. Ici chaque produit est une carte illustrée ; toucher une carte ouvre la
   * commande — déclinaison, quantité, mode de paiement — et l'accusé de réception
   * reste celui d'avant.
   *
   * L'adhérent est celui de la session : la boutique ne commande jamais pour autrui.
   */
  let {
    products = [],
    members = [],
    activeSeasonId = '',
    initialMemberId = '',
    historyHref = null,
    bankDetails = { holder: '', iban: '', bic: '' },
    paymentMethods = [],
    mediaOrigin = '',
    initialProductId = null
  }: {
    products: Product[];
    members: Member[];
    activeSeasonId: string;
    initialMemberId?: string;
    historyHref?: string | null;
    bankDetails?: ClubBankDetails;
    paymentMethods?: PaymentMethodOption[];
    /** Origine du site public, qui sert les images (`/media/…`). */
    mediaOrigin?: string;
    /** Carte à ouvrir d'emblée — un résultat de recherche mène ici, prêt à commander. */
    initialProductId?: number | null;
  } = $props();

  const member = $derived(members.find((m) => m.id.toString() === initialMemberId) ?? null);
  const families = $derived(groupFamilies(products));
  const categories = $derived(familyCategories(families));

  let selectedCategory = $state<number | null>(null);

  /* « tout » plutôt que la chaîne vide : un onglet a besoin d'une valeur, et `null` n'en est pas une. */
  function choisirCategorie(valeur: string) {
    selectedCategory = valeur === 'tout' ? null : Number(valeur);
  }
  const shown = $derived(selectedCategory === null ? families : families.filter((f) => f.product.productCategoryId === selectedCategory));

  // svelte-ignore state_referenced_locally
  let ordering = $state<ProductFamily | null>(
    initialProductId ? (groupFamilies(products).find((f) => f.product.id === initialProductId && !f.soldOut) ?? null) : null
  );
  let confirmation = $state<OrderConfirmation | null>(null);

  function imageUrl(key: string | null | undefined): string | null {
    return key ? `${mediaOrigin}/media/${key.replace(/^media\//, '')}` : null;
  }
</script>

<div class="mx-auto w-full max-w-4xl space-y-4">
  <!--
    Le titre à la forme des autres pages de l'espace adhérent — « Calendrier », « Mon
    club » : un `h1` de 24 px et sa phrase dessous. Il était en 16 px avec une icône,
    plus petit que les noms des articles qu'il coiffe.
  -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Boutique</h1>
      <p class="mt-1 text-sm text-muted-foreground">Touchez un article pour le commander.</p>
    </div>
    {#if historyHref}
      <!--
        Au doigt, un rond à icône sur la ligne du titre, aligné à droite : le lien de
        texte passait à la ligne sous le titre, en douze pixels, et se confondait avec
        la phrase d'explication juste à côté. À la souris, la phrase entière : elle dit
        où l'on va, et le curseur n'a pas besoin d'une cible de 44 points.
      -->
      <a
        href={historyHref}
        aria-label="Mon historique de commandes"
        class="border-border bg-card text-foreground hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-full border no-underline transition-colors md:hidden"
        data-testid="orders-history-link"
      >
        <History class="size-5" />
      </a>

      <a
        href={historyHref}
        class="hidden min-h-[44px] shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline md:inline-flex"
      >
        <History class="h-4 w-4" />
        Mon historique de commandes
      </a>
    {/if}
  </header>

  {#if categories.length > 1}
    <!--
      Les mêmes onglets que l'administration : le contrôle segmenté en verre sous
      768 px, la rangée d'onglets au-dessus. Des pastilles de douze pixels défilaient
      en largeur, et celle qui était active ne se distinguait que par sa couleur.
    -->
    <Tabs.Root value={selectedCategory === null ? 'tout' : String(selectedCategory)} onValueChange={choisirCategorie} class="w-full">
      <Tabs.List variant="glass" class="w-full md:hidden" aria-label="Catégories">
        <Tabs.Trigger variant="glass" value="tout">Tout</Tabs.Trigger>
        {#each categories as category (category.id)}
          <Tabs.Trigger variant="glass" value={String(category.id)}>{category.label}</Tabs.Trigger>
        {/each}
      </Tabs.List>

      <Tabs.List class="hidden w-full justify-start md:flex" aria-label="Catégories">
        <Tabs.Trigger value="tout">Tout</Tabs.Trigger>
        {#each categories as category (category.id)}
          <Tabs.Trigger value={String(category.id)}>{category.label}</Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>
  {/if}

  {#if shown.length === 0}
    <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
      <PackageOpen class="h-8 w-8 text-muted-foreground/60" />
      <p class="text-sm text-muted-foreground">Aucun article proposé pour le moment.</p>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" data-testid="product-grid">
      {#each shown as family (family.product.id)}
        <ShopProductCard {family} {imageUrl} onSelect={(f) => (ordering = f)} />
      {/each}
    </div>
  {/if}
</div>

<ShopOrderDialog
  bind:family={ordering}
  {member}
  memberId={member ? member.id.toString() : ''}
  {activeSeasonId}
  {paymentMethods}
  {imageUrl}
  onOrdered={(c) => (confirmation = c)}
/>

<ShopCatalogConfirmation bind:confirmation onAcknowledge={() => {}} {historyHref} {bankDetails} />
