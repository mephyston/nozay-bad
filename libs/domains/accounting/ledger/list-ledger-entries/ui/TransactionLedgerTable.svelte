
<script lang="ts">
  import { Check, MoreHorizontal, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown, SplitSquareVertical } from '@lucide/svelte';
  import { Button, Table, Badge, Popover, Amount, Card, DropdownMenu } from '@nba/ui';
  import type { Transaction, Pagination } from './ledger-types';
  import { accountLabels } from './ledger-types';

  let {
    transactions = [],
    pagination,
    activeCategories = [],
    isClosed,
    selectedSeasonId,
    pageRange,
    onStartEdit,
    onDelete,
    onChangePage
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    activeCategories: { id: string; code: string; name: string }[];
    isClosed: boolean;
    selectedSeasonId?: number | string;
    onStartEdit: (tx: Transaction, e: MouseEvent) => void;
    onDelete: (id: number) => void;
    onChangePage: (page: number) => void;
  } = $props();

  type GroupedTransaction = {
    isGroup: true;
    id: string;
    date: string;
    type: 'recette' | 'depense' | 'transfert';
    amountCents: number;
    runningBalanceCents: number | undefined;
    bankStatementLineId: number;
    description: string;
    reference: string;
    children: Transaction[];
  };

  type RowItem = Transaction | GroupedTransaction;

  let expandedGroups = $state<Record<number, boolean>>({});

  const groupedTransactions = $derived.by(() => {
    const result: RowItem[] = [];
    let currentGroup: GroupedTransaction | null = null;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const amt = tx.type === 'depense' ? -((tx as any).amountCents ?? tx.amount) : ((tx as any).amountCents ?? tx.amount);

      if (tx.bankStatementLineId) {
        if (currentGroup && currentGroup.bankStatementLineId === tx.bankStatementLineId) {
          // Add to existing group
          currentGroup.children.push(tx);
          currentGroup.amountCents += amt;
        } else {
          // Start new group
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentGroup = {
            isGroup: true,
            id: `group-${tx.bankStatementLineId}`,
            date: tx.date,
            type: tx.type, // Will be updated
            amountCents: amt,
            runningBalanceCents: tx.runningBalanceCents, // Chronologically last item has the real balance
            bankStatementLineId: tx.bankStatementLineId,
            description: 'Opération ventilée',
            reference: tx.reference || '',
            children: [tx]
          };
        }
      } else {
        // Not part of a group
        if (currentGroup) {
          result.push(currentGroup);
          currentGroup = null;
        }
        result.push(tx);
      }
    }
    if (currentGroup) {
      result.push(currentGroup);
    }

    return result.map(item => {
      if ('isGroup' in item && item.isGroup) {
        if (item.children.length === 1) {
          return item.children[0];
        }
        item.type = item.amountCents >= 0 ? 'recette' : 'depense';
        item.amountCents = Math.abs(item.amountCents);
        return item;
      }
      return item;
    });
  });

  function toggleGroup(bankLineId: number) {
    expandedGroups[bankLineId] = !expandedGroups[bankLineId];
  }
</script>

{#snippet desktopTxRow(tx: Transaction, isChild: boolean)}
  {@const isOtherSeason = selectedSeasonId && String(tx.seasonId) !== String(selectedSeasonId)}
  <Table.Row id="tx-desktop-{tx.id}" class="{isChild ? 'bg-muted/5 relative border-l-4 border-l-primary/30' : ''} {isOtherSeason ? 'opacity-50 border-y border-dashed border-muted-foreground/40' : ''}">
    <Table.Cell class={isChild ? "pl-6 text-muted-foreground" : ""}>{tx.date}</Table.Cell>
    <Table.Cell>
      {#if tx.type === 'recette'}
        <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
      {:else if tx.type === 'depense'}
        <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
      {:else}
        <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
      {/if}
      {#if isOtherSeason}
        <Badge variant="outline" class="ml-1 px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground border-transparent" title="Écriture rattachée à une autre saison">Cut-off</Badge>
      {/if}
    </Table.Cell>
    <Table.Cell>{tx.category ? (activeCategories.find(c => c.id === String(tx.category))?.name || tx.category) : 'Transfert'}</Table.Cell>
    <Table.Cell class="font-medium max-w-[200px] md:max-w-[300px] lg:max-w-[400px]">
      <div class="line-clamp-2" title={tx.description}>{tx.description}</div>
      {#if tx.reference}
        <div class="text-xs text-muted-foreground italic truncate mt-0.5" title={tx.reference}>Réf: {tx.reference}</div>
      {/if}
      <div class="flex flex-wrap gap-1.5 mt-1">
        {#if tx.memberName}
          <a href={`/admin/members/${tx.memberLicence}`} class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline">
            Adhérent : {tx.memberName}
          </a>
        {/if}
        {#if tx.bankStatementLineId && !isChild}
          <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
            <Check class="w-2.5 h-2.5" />
            Rapprochée (SG)
          </Badge>
        {/if}
      </div>
    </Table.Cell>
    <Table.Cell class="text-right font-bold">
      {#if tx.type === 'recette'}
        <Amount cents={(tx as any).amountCents ?? tx.amount} showSign colored />
      {:else if tx.type === 'depense'}
        <Amount cents={-((tx as any).amountCents ?? tx.amount)} showSign colored />
      {:else}
        <Amount cents={(tx as any).amountCents ?? tx.amount} class="text-muted-foreground" />
      {/if}
    </Table.Cell>
    <Table.Cell class="text-right">
      {#if isChild}
        <span class="text-muted-foreground text-xs italic opacity-50">inclus</span>
      {:else if tx.runningBalanceCents !== undefined}
        <Amount cents={tx.runningBalanceCents} class="font-bold text-foreground" />
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </Table.Cell>
    <Table.Cell class="text-right relative">
      {#if !isClosed}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            {#snippet child({ props })}
              <Button 
                {...props}
                aria-haspopup="true"
                size="icon"
                variant="ghost"
              >
                <MoreHorizontal class="h-4 w-4" />
                <span class="sr-only">Toggle menu</span>
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <DropdownMenu.Item onclick={(e) => onStartEdit(tx, e)} class="cursor-pointer">
              <Edit2 class="w-3.5 h-3.5 mr-2" /> Éditer
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => onDelete(tx.id)} class="text-destructive focus:text-destructive cursor-pointer">
              <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </Table.Cell>
  </Table.Row>
{/snippet}

{#snippet mobileTxRow(item: Transaction, isChild: boolean)}
  {@const isOtherSeason = selectedSeasonId && String(item.seasonId) !== String(selectedSeasonId)}
  <div id="tx-mobile-{item.id}" class="flex flex-col gap-2 p-4 border-b border-border/50 bg-card hover:bg-muted/20 transition-colors cursor-pointer group {isOtherSeason ? 'opacity-50 border-y border-dashed border-muted-foreground/40' : ''}" onclick={(e) => onStartEdit(item, e)}>
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="flex items-center gap-2 mb-1">
          {#if item.type === 'recette'}
            <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
          {:else if item.type === 'depense'}
            <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
          {:else}
            <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
          {/if}
          <span class="text-xs text-muted-foreground">{item.date}</span>
        </div>
        <h4 class="font-bold text-sm text-foreground">{item.description}</h4>
        {#if isOtherSeason}
          <div class="text-[10px] font-semibold text-muted-foreground mt-1 bg-muted px-1.5 py-0.5 rounded inline-block w-max">Écriture d'une autre saison (Cut-off)</div>
        {/if}
      </div>
      <div class="text-right shrink-0">
        <span class="font-bold text-base block">
          {#if item.type === 'recette'}
            <Amount cents={(item as any).amountCents ?? item.amount} showSign colored />
          {:else if item.type === 'depense'}
            <Amount cents={-((item as any).amountCents ?? item.amount)} showSign colored />
          {:else}
            <Amount cents={(item as any).amountCents ?? item.amount} class="text-muted-foreground" />
          {/if}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1">
      <div class="text-muted-foreground">
        Catégorie: <span class="font-medium text-foreground">{item.category ? (activeCategories.find(c => c.id === String(item.category))?.name || item.category) : 'Transfert'}</span>
      </div>
      {#if item.runningBalanceCents !== undefined && !isChild}
        <div class="text-muted-foreground ml-auto">
          Solde: <Amount cents={item.runningBalanceCents} class="font-bold text-foreground" />
        </div>
      {:else if isChild}
        <div class="text-muted-foreground ml-auto italic opacity-50">inclus</div>
      {/if}
      {#if item.bankStatementLineId && !isChild}
        <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
          <Check class="w-2.5 h-2.5" /> Rapprochée
        </Badge>
      {/if}
    </div>

    {#if !isClosed}
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onclick={(e) => { e.stopPropagation(); onStartEdit(item, e); }}
          class="h-8 text-xs font-semibold gap-1.5 flex-1"
        >
          <Edit2 class="w-3.5 h-3.5" />
          <span>Modifier</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          class="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Supprimer</span>
        </Button>
      </div>
    {/if}
  </div>
{/snippet}

<Card.Root>
  <!-- Vue Cartes pour Mobile -->
  <Card.Content class="p-0 block sm:hidden divide-y divide-border">
    {#each groupedTransactions as item, i}
      {#if i > 0 && item.date.substring(0, 7) !== groupedTransactions[i - 1].date.substring(0, 7) && item.runningBalanceCents !== undefined}
        {@const parts = item.date.substring(0, 7).split('-')}
        {@const monthName = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][parseInt(parts[1]) - 1]}
        <div class="px-4 py-3 bg-muted/30 flex justify-between items-center">
          <span class="font-bold text-muted-foreground uppercase text-xs tracking-wider">Solde fin {monthName} {parts[0]}</span>
          <Amount cents={item.runningBalanceCents} class="font-bold text-muted-foreground" />
        </div>
      {/if}

      {#if 'isGroup' in item && item.isGroup}
        <div class="p-4 space-y-2 bg-muted/10 cursor-pointer" onclick={() => toggleGroup(item.bankStatementLineId)}>
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2 mb-1">
                {#if item.type === 'recette'}
                  <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
                {:else if item.type === 'depense'}
                  <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
                {:else}
                  <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
                {/if}
                <span class="text-xs text-muted-foreground">{item.date}</span>
              </div>
              <h4 class="font-bold text-sm text-foreground flex items-center gap-2">
                {#if expandedGroups[item.bankStatementLineId]}
                  <ChevronDown class="w-4 h-4 text-muted-foreground shrink-0" />
                {:else}
                  <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
                {/if}
                Opération ventilée en {item.children.length} lignes
              </h4>
            </div>
            <div class="text-right shrink-0">
              <span class="font-bold text-base block">
                {#if item.type === 'recette'}
                  <Amount cents={item.amountCents} showSign colored />
                {:else if item.type === 'depense'}
                  <Amount cents={-item.amountCents} showSign colored />
                {:else}
                  <Amount cents={item.amountCents} class="text-muted-foreground" />
                {/if}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1">
            <div class="text-muted-foreground">
              Catégorie: <span class="font-medium text-foreground">Ventilation</span>
            </div>
            <div class="text-muted-foreground ml-auto">
              Solde: <Amount cents={item.runningBalanceCents} class="font-bold text-foreground" />
            </div>
            <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
              <Check class="w-2.5 h-2.5" /> Rapprochée
            </Badge>
          </div>
        </div>
        
        {#if expandedGroups[item.bankStatementLineId]}
          <div class="bg-muted/5 border-l-4 border-primary/30">
            {#each item.children as tx}
              {@render mobileTxRow(tx, true)}
            {/each}
          </div>
        {/if}
      {:else}
        {@render mobileTxRow(item as Transaction, false)}
      {/if}
    {:else}
      <div class="p-8 text-center text-muted-foreground text-sm">
        Aucune écriture comptable pour cette saison.
      </div>
    {/each}
  </Card.Content>

  <!-- Vue Tableau pour Tablette / Desktop -->
  <Card.Content class="p-0 hidden sm:block overflow-x-auto min-h-[180px]">
    <Table.Root class="w-full border-collapse text-left text-sm">
      <Table.Header>
        <Table.Row>
          <Table.Head>Date</Table.Head>
          <Table.Head>Type</Table.Head>
          <Table.Head>Catégorie</Table.Head>
          <Table.Head>Libellé</Table.Head>
          <Table.Head class="text-right">Montant</Table.Head>
          <Table.Head class="text-right">Solde</Table.Head>
          <Table.Head class="text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each groupedTransactions as item, i}
          {#if i > 0 && item.date.substring(0, 7) !== groupedTransactions[i - 1].date.substring(0, 7) && item.runningBalanceCents !== undefined}
            {@const parts = item.date.substring(0, 7).split('-')}
            {@const monthName = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][parseInt(parts[1]) - 1]}
            <Table.Row class="bg-muted/20 hover:bg-muted/20">
              <Table.Cell colspan={5} class="text-right font-bold text-muted-foreground uppercase text-xs tracking-wider py-3">
                Solde fin {monthName} {parts[0]}
              </Table.Cell>
              <Table.Cell class="text-right font-bold py-3 text-muted-foreground">
                <Amount cents={item.runningBalanceCents} />
              </Table.Cell>
              <Table.Cell class="py-3"></Table.Cell>
            </Table.Row>
          {/if}

          {#if 'isGroup' in item && item.isGroup}
            <Table.Row class="bg-muted/10 hover:bg-muted/20 cursor-pointer group" onclick={() => toggleGroup(item.bankStatementLineId)}>
              <Table.Cell>{item.date}</Table.Cell>
              <Table.Cell>
                {#if item.type === 'recette'}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
                {:else if item.type === 'depense'}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
                {:else}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="font-medium text-foreground">
                <div class="flex items-center gap-2">
                  <div class="bg-background rounded p-1 shadow-sm border border-border">
                    {#if expandedGroups[item.bankStatementLineId]}
                      <ChevronDown class="w-3 h-3 text-primary" />
                    {:else}
                      <ChevronRight class="w-3 h-3 text-primary" />
                    {/if}
                  </div>
                  Ventilation ({item.children.length})
                </div>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">
                <div class="line-clamp-2" title={item.description}>{item.description}</div>
                {#if item.reference}
                  <div class="text-xs italic truncate mt-0.5">Réf: {item.reference}</div>
                {/if}
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
                    <Check class="w-2.5 h-2.5" />
                    Rapprochée (SG)
                  </Badge>
                </div>
              </Table.Cell>
              <Table.Cell class="text-right font-bold">
                {#if item.type === 'recette'}
                  <Amount cents={item.amountCents} showSign colored />
                {:else if item.type === 'depense'}
                  <Amount cents={-item.amountCents} showSign colored />
                {:else}
                  <Amount cents={item.amountCents} class="text-muted-foreground" />
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right">
                <Amount cents={item.runningBalanceCents} class="font-bold text-foreground" />
              </Table.Cell>
              <Table.Cell class="text-right text-xs text-muted-foreground whitespace-nowrap">
                {#if !expandedGroups[item.bankStatementLineId]}
                  Cliquez pour détailler
                {/if}
              </Table.Cell>
            </Table.Row>
            
            {#if expandedGroups[item.bankStatementLineId]}
              {#each item.children as tx}
                {@render desktopTxRow(tx, true)}
              {/each}
            {/if}
          {:else}
            {@render desktopTxRow(item as Transaction, false)}
          {/if}
        {:else}
          <Table.Row>
            <Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">Aucune écriture comptable pour cette saison.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>

  <!-- Pagination Footer -->
  <Card.Footer class="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
    <Table.Pagination {pagination} {onChangePage} itemName="transaction(s)" />
  </Card.Footer>
</Card.Root>
