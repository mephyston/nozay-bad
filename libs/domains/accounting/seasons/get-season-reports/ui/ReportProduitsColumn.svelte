<script lang="ts">
  import { Input } from '@nba/ui';
  import type { ReportData, Season, DbCategory, AccountClass } from './report-types';
  import { formatAmount, getPreviousSeasonId } from './report-utils';

  let {
    mode,
    prevReport = null,
    selectedSeason,
    seasons = [],
    produitClasses,
    editableBudget = $bindable({}),
    isClosed,
    getClassCategories,
    getClassSumRealise,
    getClassSumPrevisionnel,
    getCatTotal,
    netResReal,
    netResPrev,
    totalRecReal,
    totalRecettesPrevisionnel
  }: {
    mode: 'realise' | 'previsionnel';
    prevReport?: ReportData | null;
    selectedSeason: string;
    seasons?: Season[];
    produitClasses: AccountClass[];
    editableBudget: Record<string, number>;
    isClosed: boolean;
    getClassCategories: (classCode: string, type: 'recette' | 'depense') => DbCategory[];
    getClassSumRealise: (classCode: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    getClassSumPrevisionnel: (classCode: string, type: 'recette' | 'depense') => number;
    getCatTotal: (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    netResReal: number;
    netResPrev: number;
    totalRecReal: number;
    totalRecettesPrevisionnel: number;
  } = $props();
</script>

<div class="space-y-4 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
  <div>
    <div class="flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
      <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">PRODUITS (Recettes)</span>
      <div class="flex gap-8 text-[11px]">
        <span class="w-20 text-right font-semibold">Réalisé</span>
        <span class="w-20 text-right font-semibold">Prévisionnel</span>
      </div>
    </div>
    
    <div class="space-y-4 mt-4">
      {#each produitClasses as pc}
        {#if mode === 'previsionnel' || getClassSumRealise(pc.code, 'recette', mode) > 0 || getClassSumPrevisionnel(pc.code, 'recette') > 0}
          <div class="space-y-1.5 py-1 {getClassSumRealise(pc.code, 'recette', mode) === 0 && getClassSumPrevisionnel(pc.code, 'recette') === 0 ? 'print:hidden' : ''}">
            <div class="flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
              <a href="/admin/accounting?season={selectedSeason}&classCode={pc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{pc.label}</a>
              <div class="flex gap-8">
                <span class="w-20 text-right">{formatAmount(getClassSumRealise(pc.code, 'recette', mode))}</span>
                <span class="w-20 text-right">{formatAmount(getClassSumPrevisionnel(pc.code, 'recette'))}</span>
              </div>
            </div>
            
            <div class="pl-4 space-y-1 text-xs text-muted-foreground">
              {#each getClassCategories(pc.code, 'recette') as cat}
                {#if mode === 'previsionnel' || getCatTotal(cat.id.toString(), 'recette', mode) > 0 || (editableBudget[`${cat.id}_recette`] || 0) > 0}
                  <div class="flex justify-between items-center py-0.5 text-[11px] {getCatTotal(cat.id.toString(), 'recette', mode) === 0 && (editableBudget[`${cat.id}_recette`] || 0) === 0 ? 'print:hidden' : ''}">
                    <a href="/admin/accounting?season={selectedSeason}&category={cat.id}" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                    <div class="flex gap-8 items-center">
                      <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'recette', mode))}</span>
                      {#if mode === 'previsionnel' && !isClosed}
                        <div class="relative flex items-center w-20">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={editableBudget[`${cat.id}_recette`] !== undefined ? (editableBudget[`${cat.id}_recette`] / 100) : ''}
                            oninput={(e) => {
                              const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                              editableBudget[`${cat.id}_recette`] = Math.round(val * 100);
                            }}
                            class="w-20 h-7 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium no-print"
                          />
                          <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                          <span class="hidden print:inline text-right w-full">{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
                        </div>
                      {:else}
                        <span class="w-20 text-right">{formatAmount(editableBudget[`${cat.id}_recette`] || 0)}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <div class="mt-8 pt-4 border-t border-border space-y-2 font-bold text-sm">
    {#if netResReal < 0 || netResPrev < 0}
      <div class="flex justify-between font-semibold text-xs text-destructive">
        <span>Déficit de l'exercice (Perte)</span>
        <div class="flex gap-8">
          <span class="w-20 text-right">{netResReal < 0 ? formatAmount(-netResReal) : formatAmount(0)}</span>
          <span class="w-20 text-right">{netResPrev < 0 ? formatAmount(-netResPrev) : formatAmount(0)}</span>
        </div>
      </div>
    {/if}
    <div class="flex justify-between text-foreground">
      <span>TOTAL GÉNÉRAL</span>
      <div class="flex gap-8">
        <span class="w-20 text-right">{formatAmount(netResReal < 0 ? totalRecReal + (-netResReal) : totalRecReal)}</span>
        <span class="w-20 text-right">{formatAmount(netResPrev < 0 ? totalRecettesPrevisionnel + (-netResPrev) : totalRecettesPrevisionnel)}</span>
      </div>
    </div>
  </div>
</div>
