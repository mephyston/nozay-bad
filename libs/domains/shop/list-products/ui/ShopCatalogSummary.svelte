<script lang="ts">
  import { ShoppingBag, Check, AlertCircle } from "@lucide/svelte";
  import { Button, Amount, Alert } from '@nba/ui';
  import type { Product, Member } from './catalog-types';

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
    disabled={!selectedMemberId || !selectedProduct || selectedProduct.stock <= 0 || selectedQuantity > selectedProduct.stock || submitting}
    class="w-full flex justify-center items-center gap-2 font-bold h-11 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
  >
    {#if submitting}
      <span class="animate-pulse">Envoi de la commande...</span>
    {:else}
      <ShoppingBag class="w-4 h-4" />
      Valider la commande
    {/if}
  </Button>

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
