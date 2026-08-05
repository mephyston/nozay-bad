<script lang="ts">
  import { ShoppingBag, Check, AlertCircle, Info } from "@lucide/svelte";
  import { Button, Amount, Alert } from '@nba/ui';
  import type { Product, Member } from './catalog-types';
  import { isOutOfStock } from './catalog-types';

  let {
    selectedProduct,
    selectedQuantity,
    totalPriceCents,
    selectedMemberId,
    selectedMember,
    submitting,
    successMessage,
    errorMessage,
    onOrder
  }: {
    selectedProduct: Product | null;
    selectedQuantity: number;
    totalPriceCents: number;
    selectedMemberId: string;
    selectedMember: Member | null;
    submitting: boolean;
    successMessage: string | null;
    errorMessage: string | null;
    onOrder: () => void;
  } = $props();

  // Le bouton n'est jamais grisé « sans raison » : on calcule ce qui manque et on
  // l'affiche. Le stock ne bloque que s'il est réellement suivi (trackStock).
  let blockingReason = $derived.by(() => {
    if (!selectedMemberId) return "Sélectionnez l'adhérent pour lequel commander.";
    if (!selectedProduct) return 'Sélectionnez un article pour continuer.';
    if (isOutOfStock(selectedProduct)) return `« ${selectedProduct.name} » est en rupture de stock.`;
    if (selectedProduct.trackStock && selectedQuantity > selectedProduct.stock) {
      return `Stock insuffisant : il ne reste que ${selectedProduct.stock} « ${selectedProduct.name} ».`;
    }
    return null;
  });
</script>

<div class="space-y-4">
  <div class="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
    <div class="flex justify-between items-center text-sm font-semibold text-muted-foreground">
      <span>Article sélectionné :</span>
      <span class="text-foreground">{selectedProduct ? selectedProduct.name : '—'}</span>
    </div>
    <div class="flex justify-between items-center pt-2 border-t border-border/50">
      <span class="text-base font-bold text-foreground">Montant total :</span>
      <Amount cents={totalPriceCents ?? 0} class="text-xl font-extrabold text-primary" />
    </div>
  </div>

  <!-- Submit Button -->
  <Button
    onclick={onOrder}
    disabled={blockingReason !== null || submitting}
    class="w-full flex justify-center items-center gap-2 font-bold h-11 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
  >
    {#if submitting}
      <span class="animate-pulse">Envoi de la commande...</span>
    {:else}
      <ShoppingBag class="w-4 h-4" />
      Valider la commande
    {/if}
  </Button>

  {#if blockingReason && !submitting}
    <p class="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info class="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>{blockingReason}</span>
    </p>
  {/if}

  <!-- Feedback Messages -->
  {#if successMessage}
    <Alert.Root variant="success">
      <Check class="w-4 h-4 shrink-0 mt-0.5" />
    <Alert.Description>{successMessage}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if errorMessage}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
    <Alert.Description>{errorMessage}</Alert.Description>
    </Alert.Root>
  {/if}
</div>
