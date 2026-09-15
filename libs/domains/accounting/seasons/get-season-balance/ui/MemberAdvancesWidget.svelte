<script lang="ts">
  import { HandCoins } from '@lucide/svelte';
  import { Card, Amount, Button } from '@nba/ui';
  import type { PendingAdvance } from './member-advances';

  let {
    pending = [],
    totalCents = 0,
    walletLabel = 'le porte-monnaie',
    onRefund
  }: {
    pending: PendingAdvance[];
    totalCents: number;
    /** Le porte-monnaie du club, tel qu'il est nommé dans les comptes : c'est là que l'argent se rend. */
    walletLabel?: string;
    /** Présent sur l'écran du porte-monnaie, d'où l'on rend l'argent ; absent ailleurs. */
    onRefund?: (advance: PendingAdvance) => void;
  } = $props();
</script>

<!--
  Ce que le club doit encore rendre : les virements reçus d'adhérentes que rien n'a rendus sur
  leur porte-monnaie. La liste vit ici, pas dans un carnet à côté de l'appli.
-->
<Card.Root class="border-dashed" data-testid="member-advances">
  <Card.Header class="pb-2">
    <Card.Title class="text-sm font-medium text-muted-foreground flex items-center gap-2">
      <HandCoins class="w-4 h-4" />
      Avances d'adhérents en attente
      {#if pending.length > 0}
        <span class="ml-auto font-bold text-foreground"><Amount cents={totalCents} /></span>
      {/if}
    </Card.Title>
  </Card.Header>
  <Card.Content>
    {#if pending.length === 0}
      <p class="text-sm text-muted-foreground">Rien à rendre : tous les virements reçus ont été crédités sur {walletLabel}.</p>
    {:else}
      <ul class="divide-y divide-border text-sm">
        {#each pending as advance (advance.id)}
          <li class="flex items-center gap-3 py-2">
            <span class="text-xs text-muted-foreground whitespace-nowrap">{advance.date}</span>
            <span class="flex-1 truncate">{advance.description}</span>
            <span class="text-xs text-muted-foreground whitespace-nowrap">{advance.ageDays} j</span>
            <span class="font-semibold whitespace-nowrap"><Amount cents={advance.amountCents} /></span>
            {#if onRefund}
              <Button size="sm" variant="outline" title="Depuis {walletLabel} du club vers le sien" onclick={() => onRefund(advance)}>Créditer son porte-monnaie</Button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Card.Content>
</Card.Root>
