<script lang="ts">
  import { euros } from './format';

  /** Le nombre de ventes par article : ce qui part, ce qui ne part pas. */
  let { items = [] }: { items?: { name: string; quantity: number; amountCents: number }[] } = $props();
  const total = $derived(items.reduce((sum, i) => sum + i.amountCents, 0));
</script>

{#if items.length}
  <table class="w-full text-sm">
    <thead class="text-muted-foreground text-left">
      <tr><th class="py-2 font-medium">Article</th><th class="py-2 text-right font-medium">Vendus</th><th class="py-2 text-right font-medium">Montant</th></tr>
    </thead>
    <tbody class="divide-y border-t">
      {#each items as item (item.name)}
        <tr><td class="py-2">{item.name}</td><td class="py-2 text-right tabular-nums">{item.quantity}</td><td class="py-2 text-right tabular-nums">{euros(item.amountCents)}</td></tr>
      {/each}
    </tbody>
    <tfoot class="border-t font-semibold">
      <tr><td class="py-2">Total</td><td class="py-2 text-right tabular-nums">{items.reduce((s, i) => s + i.quantity, 0)}</td><td class="py-2 text-right tabular-nums">{euros(total)}</td></tr>
    </tfoot>
  </table>
{:else}
  <p class="text-muted-foreground text-sm">Aucun article vendu.</p>
{/if}
