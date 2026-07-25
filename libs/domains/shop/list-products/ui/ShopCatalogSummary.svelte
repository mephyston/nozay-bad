<script lang="ts">
  import { ShoppingBag, Check, AlertCircle } from "@lucide/svelte";
  import { Button, Amount } from '@nba/ui';
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

  <!-- Turnstile Widget (Invisible) -->
  <div class="cf-turnstile" style={!selectedMember ? 'display: none;' : ''} data-sitekey="0x4AAAAAAD1TY7I_ql47XOjI" data-action="turnstile-spin-v1" data-size="invisible"></div>

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
    <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-start gap-2">
      <Check class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{successMessage}</span>
    </div>
  {/if}

  {#if errorMessage}
    <div class="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2">
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{errorMessage}</span>
    </div>
  {/if}
</div>
