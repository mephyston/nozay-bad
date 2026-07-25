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
  <Card.Root class="flex items-center justify-between p-6">
    <div class="space-y-1">
      <Card.Title class="text-sm font-medium tracking-tight text-muted-foreground">Solde de la Caisse</Card.Title>
      <div class="text-3xl font-bold mt-2">
        <Amount cents={currentBalance} class="text-emerald-600 dark:text-emerald-400" />
      </div>
      <Card.Description class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <span>Solde d'ouverture :</span>
        <Amount cents={initialBalance} class="font-normal text-muted-foreground" />
      </Card.Description>
    </div>
    <div class="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
      <Wallet class="w-6 h-6" />
    </div>
  </Card.Root>
  <Card.Root class="flex items-center justify-between p-6">
    <div class="space-y-1">
      <Card.Title class="text-sm font-medium tracking-tight text-muted-foreground">Total Entrées (Buvette...)</Card.Title>
      <div class="text-3xl font-bold mt-2">
        <Amount cents={totalIn} showSign class="text-primary" />
      </div>
      <Card.Description class="text-xs text-muted-foreground mt-1">Saison en cours</Card.Description>
    </div>
    <div class="p-3 bg-primary/10 rounded-full text-primary">
      <TrendingUp class="w-6 h-6" />
    </div>
  </Card.Root>
  <Card.Root class="flex items-center justify-between p-6">
    <div class="space-y-1">
      <Card.Title class="text-sm font-medium tracking-tight text-muted-foreground">Total Sorties (Monnaie...)</Card.Title>
      <div class="text-3xl font-bold mt-2">
        <Amount cents={-totalOut} showSign class="text-destructive" />
      </div>
      <Card.Description class="text-xs text-muted-foreground mt-1">Saison en cours</Card.Description>
    </div>
    <div class="p-3 bg-destructive/10 rounded-full text-destructive">
      <TrendingDown class="w-6 h-6" />
    </div>
  </Card.Root>
</div>
