<script lang="ts">
  import { Check, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { Button, Table, Badge, Popover, Amount } from '@nba/ui';
  import type { Transaction, Pagination } from './ledger-types';
  import { accountLabels } from './ledger-types';

  let {
    transactions = [],
    pagination,
    activeCategories = [],
    isClosed,
    pageRange,
    onStartEdit,
    onDelete,
    onChangePage
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    activeCategories: { id: string; code: string; name: string }[];
    isClosed: boolean;
    pageRange: (number | string)[];
    onStartEdit: (tx: Transaction, e: MouseEvent) => void;
    onDelete: (id: number) => void;
    onChangePage: (page: number) => void;
  } = $props();
</script>

<div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
  <div class="overflow-x-auto min-h-[180px]">
    <Table.Root class="w-full border-collapse text-left text-sm">
      <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
        <Table.Row>
          <Table.Head class="p-4">Date</Table.Head>
          <Table.Head class="p-4">Type</Table.Head>
          <Table.Head class="p-4">Compte(s)</Table.Head>
          <Table.Head class="p-4">Catégorie</Table.Head>
          <Table.Head class="p-4">Libellé</Table.Head>
          <Table.Head class="p-4 text-right">Montant</Table.Head>
          <Table.Head class="p-4 text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-border">
        {#each transactions as tx}
          <Table.Row class="hover:bg-muted/50 transition-colors">
            <Table.Cell class="p-4">{tx.date}</Table.Cell>
            <Table.Cell class="p-4">
              {#if tx.type === 'recette'}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
              {:else if tx.type === 'depense'}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
              {:else}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
              {/if}
            </Table.Cell>
            <Table.Cell class="p-4">
              {#if tx.type === 'transfert'}
                <span class="text-xs">{accountLabels[tx.accountId]} ➔ {accountLabels[tx.destinationAccountId!]}</span>
              {:else}
                <span class="text-xs">{accountLabels[tx.accountId]}</span>
              {/if}
            </Table.Cell>
            <Table.Cell class="p-4">{tx.category ? (activeCategories.find(c => c.id === String(tx.category))?.name || tx.category) : 'Transfert'}</Table.Cell>
            <Table.Cell class="p-4 font-medium">
              <div>{tx.description}</div>
              {#if tx.reference}
                <div class="text-xs text-muted-foreground italic">Réf: {tx.reference}</div>
              {/if}
              <div class="flex flex-wrap gap-1.5 mt-1">
                {#if tx.memberName}
                  <a href={`/admin/members/${tx.memberLicence}`} class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline">
                    Adhérent : {tx.memberName}
                  </a>
                {/if}
                {#if tx.bankStatementLineId}
                  <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
                    <Check class="w-2.5 h-2.5" />
                    Rapprochée (SG)
                  </Badge>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="p-4 text-right font-bold">
              {#if tx.type === 'recette'}
                <Amount cents={(tx as any).amountCents ?? tx.amount} showSign colored />
              {:else if tx.type === 'depense'}
                <Amount cents={-((tx as any).amountCents ?? tx.amount)} showSign colored />
              {:else}
                <Amount cents={(tx as any).amountCents ?? tx.amount} class="text-muted-foreground" />
              {/if}
            </Table.Cell>
            <Table.Cell class="p-4 text-right relative">
              {#if !isClosed}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    {#snippet child({ props })}
                      <Button 
                        {...props}
                        variant="ghost"
                        size="icon-xs"
                        class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center" 
                        aria-label="Actions"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </Button>
                    {/snippet}
                  </Popover.Trigger>
                  <Popover.Content class="w-32 p-1 bg-popover border border-border rounded-lg shadow-lg z-50 text-left divide-y divide-border" align="end">
                    <Button
                      variant="ghost"
                      onclick={(e) => onStartEdit(tx, e)}
                      class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                      Éditer
                    </Button>
                    <Button
                      variant="ghost"
                      onclick={() => onDelete(tx.id)}
                      class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      Supprimer
                    </Button>
                  </Popover.Content>
                </Popover.Root>
              {/if}
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={7} class="p-8 text-center text-muted-foreground">Aucune écriture comptable pour cette saison.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination Footer -->
  <div class="p-4 border-t border-border flex items-center justify-between">
    <div class="text-xs text-muted-foreground">
      Total : {pagination.total} transaction(s)
    </div>
    <div class="flex items-center gap-4">
      <span class="text-xs">
        Page {pagination.page} sur {pagination.totalPages}
      </span>
      <div class="flex gap-1 items-center">
        <Button
          variant="outline"
          size="icon-xs"
          class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          onclick={() => onChangePage(pagination.page - 1)}
          disabled={pagination.page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft class="w-4 h-4" />
        </Button>

        {#each pageRange as p}
          {#if p === '...'}
            <span class="px-2.5 py-1 text-xs text-muted-foreground select-none">...</span>
          {:else}
            <Button
              variant={Number(p) === pagination.page ? 'default' : 'outline'}
              size="xs"
              class="px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
              onclick={() => onChangePage(Number(p))}
              aria-current={Number(p) === pagination.page ? 'page' : undefined}
            >
              {p}
            </Button>
          {/if}
        {/each}

        <Button
          variant="outline"
          size="icon-xs"
          class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          onclick={() => onChangePage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
</div>
