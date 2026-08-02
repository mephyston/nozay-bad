<script lang="ts">
  import { Table, Card } from '@nba/ui';
  import { formatAmount } from './report-utils';
  import type { ReportData } from './report-types';

  let { forecast }: { forecast: NonNullable<NonNullable<ReportData['projections']>['treasuryForecast']> } = $props();

  // Find min and max for chart scaling (include all 3 series)
  const allValues = forecast.flatMap(f => [
    f.projectedTotal ?? f.realTotal ?? 0,
    f.projectedCurrent ?? f.realCurrent ?? 0,
    f.projectedSavings ?? f.realSavings ?? 0
  ]);
  
  // Make sure we have a sensible range even if all values are 0
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(...allValues, 100);
  
  // Add 10% padding top and bottom for better readability
  const padding = (rawMax - rawMin) * 0.1;
  const minVal = rawMin < 0 ? rawMin - padding : 0;
  const maxVal = rawMax + padding;
  const range = maxVal - minVal;

  function getY(val: number) {
    return 100 - ((val - minVal) / range) * 100;
  }

  // Generate 4 to 5 ticks for the Y axis
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }).map((_, i) => minVal + (range * i) / (tickCount - 1));
</script>

<Card.Root class="mt-8 print:break-inside-avoid">
  <Card.Content class="p-6 space-y-6">
    <div class="space-y-1">
      <h3 class="text-lg font-semibold">Prévisionnel de Trésorerie</h3>
      <p class="text-sm text-muted-foreground">
        Projection basée sur le budget restant et l'historique de saisonnalité.
      </p>
      <div class="flex gap-4 mt-2 text-xs font-medium pt-2">
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full" style="background-color: var(--primary);"></div> Total</div>
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full" style="background-color: var(--info, #3b82f6);"></div> Compte Courant</div>
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full" style="background-color: var(--success, #10b981);"></div> Livret A</div>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="w-full relative rounded-md p-2 mt-8 mb-16 pl-12 pr-4 h-[300px] flex flex-col">
      <div class="relative flex-1 w-full border-l border-b border-border/50">
        <svg class="w-full h-full overflow-visible">
          <!-- Y Axis Ticks -->
          {#each yTicks as tick}
            <line x1="-6" y1="{getY(tick)}%" x2="0" y2="{getY(tick)}%" stroke="var(--border)" stroke-width="1" />
            <text x="-12" y="{getY(tick)}%" dominant-baseline="middle" text-anchor="end" fill="var(--muted-foreground)" style="font-size: 10px; font-family: var(--font-sans);">
              {formatAmount(tick, 0)}
            </text>
          {/each}

          <!-- Horizontal reference lines (very subtle) -->
          {#each yTicks as tick}
            <line x1="0" y1="{getY(tick)}%" x2="100%" y2="{getY(tick)}%" stroke="var(--border)" opacity="0.2" stroke-width="1" />
          {/each}

          <!-- Zero line if needed -->
          {#if minVal < 0 && !yTicks.some(t => Math.abs(t) < range * 0.05)}
            <line x1="0" y1="{getY(0)}%" x2="100%" y2="{getY(0)}%" stroke="var(--destructive)" opacity="0.5" stroke-width="1" stroke-dasharray="4" />
          {/if}
          
          {#each forecast as f, i}
            {#if i > 0}
              <!-- Livret A (Success/Green) Projected (Dashed) -->
              <line 
                x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].projectedSavings ?? forecast[i-1].realSavings ?? 0)}%" 
                x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.projectedSavings ?? f.realSavings ?? 0)}%" 
                stroke="var(--success, #10b981)" opacity="0.4" stroke-width="2" stroke-dasharray="4" 
              />
              
              <!-- Livret A (Success/Green) Real -->
              {#if forecast[i-1].realSavings !== null && f.realSavings !== null}
                <line 
                  x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].realSavings!)}%" 
                  x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.realSavings!)}%" 
                  stroke="var(--success, #10b981)" stroke-width="2" stroke-linecap="round" 
                />
              {/if}

              <!-- Compte Courant (Info/Blue) Projected (Dashed) -->
              <line 
                x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].projectedCurrent ?? forecast[i-1].realCurrent ?? 0)}%" 
                x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.projectedCurrent ?? f.realCurrent ?? 0)}%" 
                stroke="var(--info, #3b82f6)" opacity="0.4" stroke-width="2" stroke-dasharray="4" 
              />

              <!-- Compte Courant (Info/Blue) Real -->
              {#if forecast[i-1].realCurrent !== null && f.realCurrent !== null}
                <line 
                  x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].realCurrent!)}%" 
                  x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.realCurrent!)}%" 
                  stroke="var(--info, #3b82f6)" stroke-width="2" stroke-linecap="round" 
                />
              {/if}

              <!-- Total (Primary) Projected (Dashed) -->
              <line 
                x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].projectedTotal ?? forecast[i-1].realTotal ?? 0)}%" 
                x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.projectedTotal ?? f.realTotal ?? 0)}%" 
                stroke="var(--primary)" opacity="0.4" stroke-width="3" stroke-dasharray="4" 
              />

              <!-- Total (Primary) Real -->
              {#if forecast[i-1].realTotal !== null && f.realTotal !== null}
                <line 
                  x1="{((i - 1) / (forecast.length - 1)) * 100}%" y1="{getY(forecast[i-1].realTotal!)}%" 
                  x2="{(i / (forecast.length - 1)) * 100}%" y2="{getY(f.realTotal!)}%" 
                  stroke="var(--primary)" stroke-width="3" stroke-linecap="round" 
                />
              {/if}
            {/if}
          {/each}
          
          <!-- Points (Total) -->
          {#each forecast as f, i}
            {#if f.realTotal !== null}
              <circle
                cx="{(i / (forecast.length - 1)) * 100}%"
                cy="{getY(f.realTotal)}%"
                r="4"
                stroke="var(--background)"
                fill="var(--primary)"
                stroke-width="2"
              >
                <title>{f.label} Total Réalisé: {formatAmount(f.realTotal)}</title>
              </circle>
            {:else}
              <circle
                cx="{(i / (forecast.length - 1)) * 100}%"
                cy="{getY(f.projectedTotal ?? 0)}%"
                r="4"
                fill="var(--background)"
                stroke="var(--primary)"
                opacity="0.5"
                stroke-width="2"
              >
                <title>{f.label} Total Projeté: {formatAmount(f.projectedTotal ?? 0)}</title>
              </circle>
            {/if}
          {/each}
        </svg>
      </div>

      <!-- X Axis Labels -->
      <div class="relative w-full h-8 mt-4">
        {#each forecast as f, i}
          <span class="absolute transform -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground" style="left: {(i / (forecast.length - 1)) * 100}%">
            {f.label.substring(0, 3)}
          </span>
        {/each}
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto mt-16 border-t border-border pt-8">
      <Table.Root class="w-full border-collapse text-left text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
          <Table.Row>
            <Table.Head class="px-2 py-3 sm:p-4 font-bold text-foreground">Mois</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right text-success">Recettes</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right text-destructive">Dépenses</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right font-semibold" style="color: var(--info, #3b82f6);">C. Courant</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right font-semibold" style="color: var(--success, #10b981);">Livret A</Table.Head>
            <Table.Head class="px-2 py-3 sm:p-4 text-right font-bold text-foreground">Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each forecast as f}
            <Table.Row class={f.realTotal !== null ? "bg-muted/30" : ""}>
              <Table.Cell class="px-2 py-3 sm:p-4 font-medium">
                {f.label}
                {#if f.realTotal !== null}
                  <span class="ml-2 text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">Réalisé</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right text-success">
                {f.projectedRecettes > 0 ? '+' + formatAmount(f.projectedRecettes) : '-'}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right text-destructive">
                {f.projectedDepenses > 0 ? '-' + formatAmount(f.projectedDepenses) : '-'}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right font-semibold {(f.projectedCurrent ?? f.realCurrent ?? 0) < 0 ? 'text-destructive' : ''}" style={(f.projectedCurrent ?? f.realCurrent ?? 0) >= 0 ? "color: var(--info, #3b82f6);" : ""}>
                {formatAmount(f.projectedCurrent ?? f.realCurrent ?? 0)}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right font-semibold {(f.projectedSavings ?? f.realSavings ?? 0) < 0 ? 'text-destructive' : ''}" style={(f.projectedSavings ?? f.realSavings ?? 0) >= 0 ? "color: var(--success, #10b981);" : ""}>
                {formatAmount(f.projectedSavings ?? f.realSavings ?? 0)}
              </Table.Cell>
              <Table.Cell class="px-2 py-3 sm:p-4 text-right font-bold {(f.projectedTotal ?? f.realTotal ?? 0) < 0 ? 'text-destructive' : ''}">
                {formatAmount(f.projectedTotal ?? f.realTotal ?? 0)}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
