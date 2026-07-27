<script lang="ts">
  import { Wallet, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { Card, Amount } from '@nba/ui';

  let {
    initialBalance = 0,
    totalIn = 0,
    totalOut = 0,
    currentBalance = 0
  }: {
    initialBalance: number;
    totalIn: number;
    totalOut: number;
    currentBalance: number;
  } = $props();
</script>

<div class="grid gap-4 md:grid-cols-3">
  <Card.Root class="relative overflow-hidden flex flex-col justify-center p-5 shadow-sm transition-all hover:shadow-md group border-border/50 bg-gradient-to-b from-card/80 to-card">
    <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
      <Wallet size={120} />
    </div>
    <div class="flex items-center justify-between space-y-0 pb-2">
      <h3 class="font-semibold text-sm tracking-tight text-muted-foreground">Solde de la Caisse</h3>
      <div class="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0"><Wallet size={18} /></div>
    </div>
    <div class="text-3xl font-bold mt-1">
      <Amount cents={currentBalance} class="text-emerald-600 dark:text-emerald-400" />
    </div>
    <div class="text-xs text-muted-foreground mt-2 flex items-center gap-1 z-10">
      <span>Solde initial :</span>
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
      <Amount cents={-totalOut} showSign class="text-destructive" />
    </div>
    <div class="text-xs text-muted-foreground mt-2 z-10">Saison en cours</div>
  </Card.Root>
</div>
