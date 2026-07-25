<script lang="ts">
  import { Wallet, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { Card } from '@nba/ui';

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

  function formatEuros(cents: number) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((cents || 0) / 100).replace(/\s/g, ' ') + ' €';
  }
</script>

<div class="grid gap-4 md:grid-cols-3">
  <Card.Root class="flex items-center justify-between p-6">
    <div class="space-y-1">
      <Card.Title class="text-sm font-medium tracking-tight text-muted-foreground">Solde de la Caisse</Card.Title>
      <div class="text-3xl font-outfit font-bold tabular-nums mt-2 text-emerald-600 dark:text-emerald-400">
        {formatEuros(currentBalance)}
      </div>
      <Card.Description class="text-xs font-outfit tabular-nums text-muted-foreground mt-1">Solde d'ouverture : {formatEuros(initialBalance)}</Card.Description>
    </div>
    <div class="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
      <Wallet class="w-6 h-6" />
    </div>
  </Card.Root>
  <Card.Root class="flex items-center justify-between p-6">
    <div class="space-y-1">
      <Card.Title class="text-sm font-medium tracking-tight text-muted-foreground">Total Entrées (Buvette...)</Card.Title>
      <div class="text-3xl font-outfit font-bold tabular-nums mt-2 text-primary">
        +{formatEuros(totalIn)}
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
      <div class="text-3xl font-outfit font-bold tabular-nums mt-2 text-destructive">
        -{formatEuros(totalOut)}
      </div>
      <Card.Description class="text-xs text-muted-foreground mt-1">Saison en cours</Card.Description>
    </div>
    <div class="p-3 bg-destructive/10 rounded-full text-destructive">
      <TrendingDown class="w-6 h-6" />
    </div>
  </Card.Root>
</div>
