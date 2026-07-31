<script lang="ts">
  import { Card, DashboardCard } from '@nba/ui';

  interface ChartSlice {
    label: string;
    value: number;
    percent: string;
    pathData: string;
    color: string;
  }

  let { mode, chargesData, recettesData }: { mode: 'realise' | 'previsionnel'; chargesData: ChartSlice[]; recettesData: ChartSlice[] } = $props();
</script>

<Card.Root class="page-break">
  <Card.Content class="p-6 space-y-6">
    <div class="text-center space-y-1 mb-2">
      <h3 class="text-lg font-bold tracking-tight">
        {mode === 'realise' ? '2. Répartition Graphique du Réalisé' : '4. Répartition Graphique des Budgets'}
      </h3>
      <p class="text-xs text-muted-foreground">Représentation par classes de comptes (Mode : {mode === 'realise' ? 'Réalisé' : 'Prévisionnel'})</p>
    </div>
    
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Charges Chart -->
        <DashboardCard class="flex flex-col items-center justify-between">
        {#snippet header()}
        <h4 class="font-bold text-sm text-destructive text-center">Charges (Dépenses)</h4>
        {/snippet}
        {#if chargesData.length > 0}
          <div class="flex flex-col items-center gap-6 w-full mt-2">
            <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
              {#each chargesData as slice}
                <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
              {/each}
            </svg>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
              {#each chargesData as slice}
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                  <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-semibold">{slice.percent}%</strong></span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground italic my-8 text-center">Aucune charge à afficher.</p>
        {/if}
      </DashboardCard>

      <!-- Recettes Chart -->
        <DashboardCard class="flex flex-col items-center justify-between">
        {#snippet header()}
        <h4 class="font-bold text-sm text-success text-center">Produits (Recettes)</h4>
        {/snippet}
        {#if recettesData.length > 0}
          <div class="flex flex-col items-center gap-6 w-full mt-2">
            <svg width="180" height="180" viewBox="0 0 200 200" class="drop-shadow-sm rotate-[-90deg]">
              {#each recettesData as slice}
                <path d={slice.pathData} fill={slice.color} class="hover:opacity-90 transition-opacity" />
              {/each}
            </svg>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs pt-4 border-t border-border/60">
              {#each recettesData as slice}
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
                  <span class="truncate text-foreground/80 font-medium" title={slice.label}>{slice.label} : <strong class="font-semibold">{slice.percent}%</strong></span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground italic my-8 text-center">Aucune recette à afficher.</p>
        {/if}
      </DashboardCard>
    </div>
  </Card.Content>
</Card.Root>
