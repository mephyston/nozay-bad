<script lang="ts">
  import { Table, Amount, Badge } from '@nba/ui';
  import type { ReportData, DbCategory } from './report-types';
  import { getCatTotal as calcGetCatTotal } from './report-calculations';

  let {
    report,
    categories = []
  }: {
    report: ReportData;
    categories?: DbCategory[];
  } = $props();

  const getCatTotal = (id: string, type: 'recette' | 'depense', mode: 'realise' | 'previsionnel') => calcGetCatTotal(report, null, id, type, mode);

  let analyticRows = $derived(
    categories
      .filter(cat => cat.active !== false)
      .map(cat => {
        const recettes = getCatTotal(cat.id.toString(), 'recette', 'realise');
        const depenses = getCatTotal(cat.id.toString(), 'depense', 'realise');
        return {
          ...cat,
          recettes,
          depenses,
          net: recettes - depenses
        };
      })
      .filter(row => row.recettes > 0 || row.depenses > 0)
      .sort((a, b) => b.net - a.net) // Tri par bénéfice (excédent en premier)
  );

  let totalRecettes = $derived(analyticRows.reduce((sum, r) => sum + r.recettes, 0));
  let totalDepenses = $derived(analyticRows.reduce((sum, r) => sum + r.depenses, 0));
  let totalNet = $derived(totalRecettes - totalDepenses);
</script>

<div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden print-container">
  <div class="p-4 sm:p-6 border-b border-border bg-muted/20">
    <h3 class="text-lg font-semibold text-foreground">Bilan Analytique par Catégorie</h3>
    <p class="text-sm text-muted-foreground mt-1">Comparaison des recettes et dépenses pour évaluer la rentabilité nette de chaque activité.</p>
  </div>
  
  <div class="p-0 sm:p-6 overflow-x-auto">
    <Table.Root class="w-full">
      <Table.Header>
        <Table.Row class="bg-muted/50 hover:bg-muted/50">
          <Table.Head class="font-bold text-foreground">Catégorie Analytique</Table.Head>
          <Table.Head class="text-right font-bold text-foreground">Total Recettes</Table.Head>
          <Table.Head class="text-right font-bold text-foreground">Total Dépenses</Table.Head>
          <Table.Head class="text-right font-bold text-foreground">Solde Net</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each analyticRows as row}
          <Table.Row class="group hover:bg-muted/20 transition-colors">
            <Table.Cell class="font-medium">
              <span class="text-sm">{row.adminLabel || row.name}</span>
            </Table.Cell>
            <Table.Cell class="text-right text-emerald-600 dark:text-emerald-400 font-medium">
              {#if row.recettes > 0}
                + <Amount cents={row.recettes} />
              {:else}
                <span class="text-muted-foreground/40">-</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right text-destructive font-medium">
              {#if row.depenses > 0}
                - <Amount cents={row.depenses} />
              {:else}
                <span class="text-muted-foreground/40">-</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right">
              <Badge variant={row.net > 0 ? "outline" : (row.net < 0 ? "destructive" : "secondary")} class="font-outfit tabular-nums ml-auto {row.net > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}">
                {#if row.net > 0}+{/if}<Amount cents={row.net} />
              </Badge>
            </Table.Cell>
          </Table.Row>
        {/each}
        {#if analyticRows.length === 0}
          <Table.Row>
            <Table.Cell colspan={4} class="text-center py-8 text-muted-foreground italic">
              Aucune donnée analytique pour cette saison.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
      {#if analyticRows.length > 0}
        <Table.Footer class="bg-muted/50 border-t-2 border-border font-bold">
          <Table.Row class="hover:bg-muted/50">
            <Table.Cell class="text-foreground uppercase">Total Global</Table.Cell>
            <Table.Cell class="text-right text-emerald-600 dark:text-emerald-400">+ <Amount cents={totalRecettes} /></Table.Cell>
            <Table.Cell class="text-right text-destructive">- <Amount cents={totalDepenses} /></Table.Cell>
            <Table.Cell class="text-right">
              <Badge variant={totalNet > 0 ? "outline" : (totalNet < 0 ? "destructive" : "secondary")} class="font-outfit tabular-nums ml-auto text-sm px-2 py-0.5 {totalNet > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : ''}">
                {#if totalNet > 0}+{/if}<Amount cents={totalNet} />
              </Badge>
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      {/if}
    </Table.Root>
  </div>
</div>
