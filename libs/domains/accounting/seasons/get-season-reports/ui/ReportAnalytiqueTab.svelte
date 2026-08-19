<script lang="ts">
  import { Table, Amount, Badge, Card } from '@nba/ui';
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

<Card.Root class="overflow-hidden print-container">
  <div class="p-4 sm:p-6 border-b border-border bg-muted/20">
    <h3 class="text-lg font-semibold text-foreground">Bilan Analytique par Catégorie</h3>
    <p class="text-sm text-muted-foreground mt-1">Comparaison des recettes et dépenses pour évaluer la rentabilité nette de chaque activité.</p>
  </div>
  
  <Card.Content class="p-0 sm:p-6 overflow-x-auto">
    <Table.Root class="w-full">
      <Table.Header>
        <Table.Row class="bg-muted/50 hover:bg-muted/50">
          <Table.Head class="font-bold text-foreground">Catégorie Analytique</Table.Head>
          <Table.Head class="hidden sm:table-cell text-right font-bold text-foreground">Total Recettes</Table.Head>
          <Table.Head class="hidden sm:table-cell text-right font-bold text-foreground">Total Dépenses</Table.Head>
          <Table.Head class="text-right font-bold text-foreground">Solde Net</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each analyticRows as row}
          <Table.Row class="group hover:bg-muted/20 transition-colors">
            <Table.Cell class="font-medium align-top sm:align-middle">
              <div class="text-sm font-semibold">{row.adminLabel || row.name}</div>
              <div class="sm:hidden flex items-center gap-3 mt-1.5 text-xs font-normal">
                {#if row.recettes > 0}
                  <span class="text-success flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    <Amount cents={row.recettes} />
                  </span>
                {/if}
                {#if row.depenses > 0}
                  <span class="text-destructive flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    <Amount cents={row.depenses} />
                  </span>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell text-right text-success font-medium">
              {#if row.recettes > 0}
                + <Amount cents={row.recettes} />
              {:else}
                <span class="text-muted-foreground/40">-</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell text-right text-destructive font-medium">
              {#if row.depenses > 0}
                - <Amount cents={row.depenses} />
              {:else}
                <span class="text-muted-foreground/40">-</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right align-top sm:align-middle">
              <Badge variant={row.net > 0 ? "success" : (row.net < 0 ? "destructive" : "secondary")} class="font-outfit tabular-nums ml-auto">
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
            <Table.Cell class="text-foreground uppercase align-top sm:align-middle">
              Total Global
              <div class="sm:hidden flex items-center gap-3 mt-1.5 text-xs font-normal normal-case">
                <span class="text-success flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  <Amount cents={totalRecettes} />
                </span>
                <span class="text-destructive flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <Amount cents={totalDepenses} />
                </span>
              </div>
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell text-right text-success">+ <Amount cents={totalRecettes} /></Table.Cell>
            <Table.Cell class="hidden sm:table-cell text-right text-destructive">- <Amount cents={totalDepenses} /></Table.Cell>
            <Table.Cell class="text-right align-top sm:align-middle">
              <Badge variant={totalNet > 0 ? "success" : (totalNet < 0 ? "destructive" : "secondary")} size="lg" class="font-outfit tabular-nums ml-auto">
                {#if totalNet > 0}+{/if}<Amount cents={totalNet} />
              </Badge>
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      {/if}
    </Table.Root>
</Card.Content>
</Card.Root>
