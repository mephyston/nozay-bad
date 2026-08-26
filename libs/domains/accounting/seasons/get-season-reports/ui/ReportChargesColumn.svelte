<script lang="ts">
  import { Input } from '@nba/ui';
  import type { ReportData, Season, DbCategory, AccountClass } from './report-types';
  import { formatAmount, formatDelta, getPreviousSeasonId } from './report-utils';
  import { UNCLASSIFIED_CLASS_CODE } from './report-calculations';

  let {
    mode,
    prevReport = null,
    selectedSeason,
    seasons = [],
    chargeClasses,
    editableBudget = $bindable({}),
    isClosed,
    secondaryView = 'previsionnel',
    getClassCategories,
    getClassSumRealise,
    getClassSumPrevisionnel,
    getCatTotal,
    netResReal,
    netResPrev,
    totalDepReal,
    totalDepensesPrevisionnel
  }: {
    mode: 'realise' | 'previsionnel';
    prevReport?: ReportData | null;
    selectedSeason: string;
    seasons?: Season[];
    chargeClasses: AccountClass[];
    editableBudget: Record<string, number>;
    isClosed: boolean;
    // Sur écran étroit (< lg) : quelle 2e colonne afficher (compte de résultat).
    secondaryView?: 'previsionnel' | 'ecart';
    getClassCategories: (classCode: string, type: 'recette' | 'depense') => DbCategory[];
    getClassSumRealise: (classCode: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    getClassSumPrevisionnel: (classCode: string, type: 'recette' | 'depense') => number;
    getCatTotal: (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => number;
    netResReal: number;
    netResPrev: number;
    totalDepReal: number;
    totalDepensesPrevisionnel: number;
  } = $props();

  // Colonnes Prévisionnel / Écart : les deux visibles dès xl ; sous xl, une seule
  // selon le switch (l'Écart n'existe que pour le compte de résultat réalisé).
  const prevCls = $derived(mode === 'realise' && secondaryView === 'ecart' ? 'hidden xl:block' : '');
  const ecartCls = $derived(secondaryView === 'ecart' ? '' : 'hidden xl:block');
  // Charge : réalisé < prévu = favorable (vert), dépassement = défavorable (rouge).
  const ecartColor = (diff: number) => (diff === 0 ? 'text-muted-foreground' : diff < 0 ? 'text-success' : 'text-destructive');
</script>

<div data-report-col="charges" class="space-y-4 pr-0 md:pr-6 flex flex-col justify-between">
  <div>
    <div class="rpt-col-head flex justify-between items-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
      <span class="text-sm font-bold text-destructive">CHARGES (Dépenses)</span>
      <div class="flex gap-8 text-[11px]">
        <span class="w-20 text-right font-semibold">Réalisé</span>
        <span class="w-20 text-right font-semibold {prevCls}">Prévisionnel</span>
        {#if mode === 'realise'}
          <span class="w-20 text-right font-semibold {ecartCls}">Écart</span>
        {/if}
      </div>
    </div>

    <div class="space-y-4 mt-4">
      {#each chargeClasses as cc}
        {#if mode === 'previsionnel' || getClassSumRealise(cc.code, 'depense', mode) > 0 || getClassSumPrevisionnel(cc.code, 'depense') > 0}
          <div class="space-y-1.5 py-1 {getClassSumRealise(cc.code, 'depense', mode) === 0 && getClassSumPrevisionnel(cc.code, 'depense') === 0 ? 'print:hidden' : ''}">
            <div class="rpt-sec-head flex justify-between items-center text-sm border-b border-border/40 pb-1 font-bold text-foreground">
              {#if cc.code === UNCLASSIFIED_CLASS_CODE}
                <!--
                  Pas de lien : « Non ventilé » n'est pas une classe du plan de comptes, le grand
                  livre ne sait pas filtrer dessus. Ces montants comptent dans le total mais
                  n'appartiennent à aucune rubrique — c'est justement ce qu'il faut voir.
                -->
                <span class="text-foreground/90" title="Catégories sans classe de compte de ce côté, et écritures sans catégorie. À rattacher depuis Réglages › Comptabilité.">{cc.label}</span>
              {:else}
                <a href="/admin/accounting?season={selectedSeason}&classCode={cc.code}" class="hover:underline hover:text-primary transition-colors cursor-pointer text-foreground/90 print:no-underline" title="Voir les écritures dans le grand livre">{cc.label}</a>
              {/if}
              <div class="flex gap-8 font-outfit tabular-nums">
                <span class="w-20 text-right">{formatAmount(getClassSumRealise(cc.code, 'depense', mode))}</span>
                <span class="w-20 text-right {prevCls}">{formatAmount(getClassSumPrevisionnel(cc.code, 'depense'))}</span>
                {#if mode === 'realise'}
                  {@const diff = getClassSumRealise(cc.code, 'depense', mode) - getClassSumPrevisionnel(cc.code, 'depense')}
                  <span class="w-20 text-right {ecartCls} {ecartColor(diff)}">{formatDelta(diff)}</span>
                {/if}
              </div>
            </div>

            <div class="pl-4 space-y-1 text-xs text-muted-foreground">
              {#each getClassCategories(cc.code, 'depense') as cat}
                {#if mode === 'previsionnel' || getCatTotal(cat.id.toString(), 'depense', mode) > 0 || (editableBudget[`${cat.id}_depense`] || 0) > 0}
                  <div class="flex justify-between items-center py-0.5 text-[11px] {getCatTotal(cat.id.toString(), 'depense', mode) === 0 && (editableBudget[`${cat.id}_depense`] || 0) === 0 ? 'print:hidden' : ''}">
                    <a href="/admin/accounting?season={selectedSeason}&category={cat.id}&type=depense" class="font-sans text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer print:no-underline" title="Voir les écritures de cette catégorie dans le grand livre">• {cat.adminLabel}</a>
                    <div class="flex gap-8 items-center font-outfit tabular-nums">
                      <span class="w-20 text-right">{formatAmount(getCatTotal(cat.id.toString(), 'depense', mode))}</span>
                      {#if mode === 'previsionnel' && !isClosed}
                        <div class="relative flex items-center w-20">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={editableBudget[`${cat.id}_depense`] !== undefined ? (editableBudget[`${cat.id}_depense`] / 100) : ''}
                            oninput={(e) => {
                              const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                              editableBudget[`${cat.id}_depense`] = Math.round(val * 100);
                            }}
                            class="w-20 h-7 px-1 py-0.5 text-right border border-border bg-background rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-outfit tabular-nums no-print"
                          />
                          <span class="absolute right-1 text-[10px] text-muted-foreground pointer-events-none no-print">€</span>
                          <span class="hidden print:inline text-right w-full">{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
                        </div>
                      {:else}
                        <span class="w-20 text-right {prevCls}">{formatAmount(editableBudget[`${cat.id}_depense`] || 0)}</span>
                      {/if}
                      {#if mode === 'realise'}
                        {@const diff = getCatTotal(cat.id.toString(), 'depense', mode) - (editableBudget[`${cat.id}_depense`] || 0)}
                        <span class="w-20 text-right {ecartCls} {ecartColor(diff)}">{formatDelta(diff)}</span>
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
    {#if netResReal >= 0 || netResPrev >= 0}
      <div class="flex justify-between font-semibold text-xs text-success">
        <span>Excédent de l'exercice (Bénéfice)</span>
        <div class="flex gap-8 font-outfit tabular-nums">
          <span class="w-20 text-right">{netResReal >= 0 ? formatAmount(netResReal) : formatAmount(0)}</span>
          <span class="w-20 text-right {prevCls}">{netResPrev >= 0 ? formatAmount(netResPrev) : formatAmount(0)}</span>
          {#if mode === 'realise'}<span class="w-20 {ecartCls}"></span>{/if}
        </div>
      </div>
    {/if}
    <div class="rpt-total flex justify-between text-foreground">
      <span>TOTAL GÉNÉRAL</span>
      <div class="flex gap-8 font-outfit tabular-nums">
        <span class="w-20 text-right">{formatAmount(netResReal >= 0 ? totalDepReal + netResReal : totalDepReal)}</span>
        <span class="w-20 text-right {prevCls}">{formatAmount(netResPrev >= 0 ? totalDepensesPrevisionnel + netResPrev : totalDepensesPrevisionnel)}</span>
        {#if mode === 'realise'}<span class="w-20 {ecartCls}"></span>{/if}
      </div>
    </div>
  </div>
</div>
