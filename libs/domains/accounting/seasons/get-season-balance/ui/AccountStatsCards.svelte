<script lang="ts">
  import { Wallet, TrendingUp, TrendingDown, HandCoins } from '@lucide/svelte';
  import { Card, Amount } from '@nba/ui';

  let {
    label,
    thirdParty = false,
    initialBalance = 0,
    totalIn = 0,
    totalOut = 0,
    currentBalance = 0
  }: {
    label: string;
    /** Compte de tiers : le solde se lit comme une dette, en positif. */
    thirdParty?: boolean;
    initialBalance: number;
    totalIn: number;
    totalOut: number;
    currentBalance: number;
  } = $props();

  /*
    Un compte de tiers (le compte d'attente des adhérents) n'a pas de « solde » au sens de la
    trésorerie : négatif, c'est ce que le club doit rendre ; positif, ce qu'il a avancé.
  */
  const soldeTitre = $derived(
    !thirdParty ? `Solde · ${label}`
      : currentBalance < 0 ? 'Dû aux adhérents'
      : currentBalance > 0 ? 'Avancé aux adhérents'
      : 'Rien à rendre aux adhérents'
  );
</script>

<div class="grid gap-4 md:grid-cols-3">
  <Card.Root class="relative overflow-hidden flex flex-col justify-center p-5 shadow-sm transition-all hover:shadow-md group border-border/50 bg-gradient-to-b from-card/80 to-card {thirdParty ? 'border-dashed' : ''}">
    <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
      {#if thirdParty}<HandCoins size={120} />{:else}<Wallet size={120} />{/if}
    </div>
    <div class="flex items-center justify-between space-y-0 pb-2">
      <h3 class="font-semibold text-sm tracking-tight text-muted-foreground">{soldeTitre}</h3>
      <div class="p-2 bg-success/10 text-success rounded-lg shrink-0">
        {#if thirdParty}<HandCoins size={18} />{:else}<Wallet size={18} />{/if}
      </div>
    </div>
    <div class="text-3xl font-bold mt-1">
      {#if thirdParty}
        <Amount cents={Math.abs(currentBalance)} />
      {:else}
        <Amount cents={currentBalance} class="" colorize={true} />
      {/if}
    </div>
    <div class="text-xs text-muted-foreground mt-2 flex items-center gap-1 z-10">
      {#if thirdParty}
        <span>Hors trésorerie · solde initial :</span>
      {:else}
        <span>Solde initial :</span>
      {/if}
      <Amount cents={initialBalance} class="font-normal text-muted-foreground" />
    </div>
  </Card.Root>

  <Card.Root class="relative overflow-hidden flex flex-col justify-center p-5 shadow-sm transition-all hover:shadow-md group border-border/50 bg-gradient-to-b from-card/80 to-card">
    <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
      <TrendingUp size={120} />
    </div>
    <div class="flex items-center justify-between space-y-0 pb-2">
      <h3 class="font-semibold text-sm tracking-tight text-muted-foreground">Total Entrées</h3>
      <div class="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><TrendingUp size={18} /></div>
    </div>
    <div class="text-3xl font-bold mt-1">
      <Amount cents={totalIn} showSign class="text-primary" />
    </div>
    <div class="text-xs text-muted-foreground mt-2 z-10">Saison en cours</div>
  </Card.Root>

  <Card.Root class="relative overflow-hidden flex flex-col justify-center p-5 shadow-sm transition-all hover:shadow-md group border-border/50 bg-gradient-to-b from-card/80 to-card">
    <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
      <TrendingDown size={120} />
    </div>
    <div class="flex items-center justify-between space-y-0 pb-2">
      <h3 class="font-semibold text-sm tracking-tight text-muted-foreground">Total Sorties</h3>
      <div class="p-2 bg-destructive/10 text-destructive rounded-lg shrink-0"><TrendingDown size={18} /></div>
    </div>
    <div class="text-3xl font-bold mt-1">
      <Amount cents={-totalOut} showSign colorize={true} />
    </div>
    <div class="text-xs text-muted-foreground mt-2 z-10">Saison en cours</div>
  </Card.Root>
</div>
