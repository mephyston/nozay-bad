<script lang="ts">
  import { Check, MoreHorizontal, Edit2, Trash2, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { Button, Table, Badge, Popover, Amount, Card, DropdownMenu } from '@nba/ui';
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
    onStartEdit: (tx: Transaction, e: MouseEvent) => void;
    onDelete: (id: number) => void;
    onChangePage: (page: number) => void;
  } = $props();
</script>

<Card.Root>
  <!-- Vue Cartes pour Mobile -->
  <Card.Content class="p-0 block sm:hidden divide-y divide-border">
    {#each transactions as tx}
      <div class="p-4 space-y-2 bg-card" id="tx-mobile-{tx.id}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 mb-1">
              {#if tx.type === 'recette'}
                <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
              {:else if tx.type === 'depense'}
                <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
              {:else}
                <Badge variant="outline" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
              {/if}
              <span class="text-xs text-muted-foreground">{tx.date}</span>
            </div>
            <h4 class="font-bold text-sm text-foreground">{tx.description}</h4>
          </div>
          <div class="text-right shrink-0">
            <span class="font-bold text-base block">
              {#if tx.type === 'recette'}
                <Amount cents={(tx as any).amountCents ?? tx.amount} showSign colored />
              {:else if tx.type === 'depense'}
                <Amount cents={-((tx as any).amountCents ?? tx.amount)} showSign colored />
              {:else}
                <Amount cents={(tx as any).amountCents ?? tx.amount} class="text-muted-foreground" />
              {/if}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1">
          <div class="text-muted-foreground">
            Catégorie: <span class="font-medium text-foreground">{tx.category ? (activeCategories.find(c => c.id === String(tx.category))?.name || tx.category) : 'Transfert'}</span>
          </div>
          {#if tx.runningBalanceCents !== undefined}
            <div class="text-muted-foreground ml-auto">
              Solde: <Amount cents={tx.runningBalanceCents} class="font-bold text-foreground" />
            </div>
          {/if}
          {#if tx.bankStatementLineId}
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
              onclick={(e) => onStartEdit(tx, e)}
              class="h-8 text-xs font-semibold gap-1.5 flex-1"
            >
              <Edit2 class="w-3.5 h-3.5" />
              <span>Modifier</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() => onDelete(tx.id)}
              class="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </Button>
          </div>
        {/if}
      </div>
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
        {#each transactions as tx}
          <Table.Row id="tx-desktop-{tx.id}">
            <Table.Cell>{tx.date}</Table.Cell>
            <Table.Cell>
              {#if tx.type === 'recette'}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
              {:else if tx.type === 'depense'}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
              {:else}
                <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
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
                {#if tx.bankStatementLineId}
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
              {#if tx.runningBalanceCents !== undefined}
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
