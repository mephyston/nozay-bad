<script lang="ts">
  import { ShoppingBag, History, PackageOpen } from '@lucide/svelte';
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
  <header class="flex flex-row flex-wrap items-center gap-3">
    <ShoppingBag class="h-5 w-5 shrink-0 text-primary" />
    <div class="min-w-0">
      <h1 class="text-base font-semibold text-foreground">Boutique du club</h1>
      <p class="mt-0.5 text-xs text-muted-foreground">Touchez un article pour le commander.</p>
    </div>
    {#if historyHref}
      <a
        href={historyHref}
        class="basis-full pl-8 min-h-[44px] sm:basis-auto sm:pl-0 sm:min-h-0 sm:ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        data-testid="orders-history-link"
      >
        <History class="h-3.5 w-3.5" />
        Mon historique de commandes
      </a>
    {/if}
  </header>

  {#if categories.length > 1}
    <nav class="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" aria-label="Catégories">
      <button
        type="button"
        onclick={() => (selectedCategory = null)}
        aria-pressed={selectedCategory === null}
        class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition
          {selectedCategory === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50'}"
      >
        Tout
      </button>
      {#each categories as category (category.id)}
        <button
          type="button"
          onclick={() => (selectedCategory = category.id)}
          aria-pressed={selectedCategory === category.id}
          class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition
            {selectedCategory === category.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50'}"
        >
          {category.label}
        </button>
      {/each}
    </nav>
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
