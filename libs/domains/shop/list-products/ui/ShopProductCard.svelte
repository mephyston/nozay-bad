<script lang="ts">
  import { ShoppingBag, Package } from '@lucide/svelte';
  import { Badge } from '@nba/ui';
  import type { ProductFamily } from './catalog-families';
  import { formatEuros } from './catalog-families';

  /**
   * Une carte de la vitrine : l'image, le nom, le prix — et ce qu'il reste à choisir.
   *
   * Toute la carte est un bouton : sur un téléphone, viser un petit « Commander » sous
   * l'image est le geste qu'on rate. Une famille épuisée reste affichée, grisée : un
   * article qui disparaît sans explication passe pour un bogue.
   */
  let {
    family,
    imageUrl,
    onSelect
  }: {
    family: ProductFamily;
    imageUrl: (key: string | null | undefined) => string | null;
    onSelect: (family: ProductFamily) => void;
  } = $props();

  const src = $derived(imageUrl(family.product.imageKey));
  const price = $derived(
    family.priceMinCents === family.priceMaxCents
      ? formatEuros(family.priceMinCents)
      : `dès ${formatEuros(family.priceMinCents)}`
  );
  const choicesLabel = $derived(
    family.variants.length > 1 ? `${family.variants.length} choix` : family.variants.length === 1 ? '1 choix' : null
  );
</script>

<button
  type="button"
  onclick={() => onSelect(family)}
  disabled={family.soldOut}
  data-testid="product-card"
  class="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition
    hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
    disabled:cursor-not-allowed disabled:opacity-60"
>
  <div class="relative aspect-square w-full bg-muted/40">
    {#if src}
      <img {src} alt={family.product.name} loading="lazy" class="h-full w-full object-contain p-2" />
    {:else}
      <div class="flex h-full w-full items-center justify-center text-muted-foreground/50">
        <Package class="h-10 w-10" />
      </div>
    {/if}
    {#if family.soldOut || choicesLabel}
      <div class="absolute left-2 top-2">
        {#if family.soldOut}
          <Badge variant="destructive" size="xs">Rupture</Badge>
        {:else}
          <Badge variant="secondary" size="xs">{choicesLabel}</Badge>
        {/if}
      </div>
    {/if}
  </div>
  <div class="flex flex-1 flex-col gap-1 p-3">
    <h3 class="text-sm font-semibold leading-snug text-foreground line-clamp-2">{family.product.name}</h3>
    {#if family.product.description}
      <p class="text-xs text-muted-foreground line-clamp-2">{family.product.description}</p>
    {/if}
    <div class="mt-auto flex items-center justify-between pt-1">
      <span class="font-outfit text-base font-bold tabular-nums text-foreground">{price}</span>
      {#if !family.soldOut}
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <ShoppingBag class="h-4 w-4" />
        </span>
      {/if}
    </div>
  </div>
</button>
