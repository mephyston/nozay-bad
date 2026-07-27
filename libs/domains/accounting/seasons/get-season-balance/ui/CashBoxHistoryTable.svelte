<script lang="ts">
  import { FileText, Search, Trash2, Plus } from '@lucide/svelte';
  import { Button, Input, Badge, Card, Table, Amount } from '@nba/ui';
  import type { CashTransaction } from './cashbox-types';
  import { categoryLabels } from './cashbox-types';

  let {
    filteredTransactions = [],
    searchTerm = $bindable(''),
    isClosed,
    onDelete,
    onNewMovement
  }: {
    filteredTransactions: CashTransaction[];
    searchTerm: string;
    isClosed: boolean;
    onDelete: (id: number) => void;
    onNewMovement?: () => void;
  } = $props();
</script>

<Card.Root class="md:col-span-3">
  <Card.Header class="pb-2 border-b border-border">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <Card.Title class="text-lg font-semibold flex items-center gap-2">
        <FileText class="w-5 h-5 text-primary" />
        Derniers mouvements
      </Card.Title>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <div class="relative flex-1 sm:flex-none">
          <Search class="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder="Rechercher..."
            bind:value={searchTerm}
            class="pl-8 pr-3 w-full sm:w-48 h-8 text-xs"
          />
        </div>
        {#if onNewMovement}
          <Button
            onclick={onNewMovement}
            disabled={isClosed}
            size="sm"
            class="h-8 shrink-0 text-xs font-semibold"
          >
            Nouveau
          </Button>
        {/if}
      </div>
    </div>
  </Card.Header>
  <Card.Content class="pt-4">
    <Table.Root>
      <Table.Header>
        <Table.Row class="border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
          <Table.Head class="hidden md:table-cell py-3 px-2">Date</Table.Head>
          <Table.Head class="py-3 px-2">Description</Table.Head>
          <Table.Head class="hidden sm:table-cell py-3 px-2">Catégorie</Table.Head>
          <Table.Head class="py-3 px-2 text-right">Montant</Table.Head>
          <Table.Head class="py-3 px-2 text-right">Action</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-border">
        {#each filteredTransactions as tx}
          <Table.Row class="hover:bg-muted/40 transition-colors">
            <Table.Cell class="hidden md:table-cell py-3 px-2 text-xs whitespace-nowrap">{tx.date}</Table.Cell>
            <Table.Cell class="py-3 px-2 font-medium">
              <div>{tx.description}</div>
              {#if tx.type === 'transfert'}
                <Badge variant="outline" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-primary/10 text-primary border-transparent">
                  Virement interne
                </Badge>
              {/if}
            </Table.Cell>
            <Table.Cell class="hidden sm:table-cell py-3 px-2 text-xs text-muted-foreground">
              {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Transfert'}
            </Table.Cell>
            <Table.Cell class="py-3 px-2 text-right font-bold">
              {#if tx.type === 'recette'}
                <Amount cents={tx.amount} showSign colored />
              {:else if tx.type === 'depense'}
                <Amount cents={-tx.amount} showSign colored />
              {:else if tx.type === 'transfert' && tx.destinationAccountId === 'cash'}
                <Amount cents={tx.amount} showSign colored />
              {:else}
                <Amount cents={-tx.amount} showSign colored />
              {/if}
            </Table.Cell>
            <Table.Cell class="py-3 px-2 text-right">
              {#if tx.type !== 'transfert'}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onclick={() => onDelete(tx.id)}
                  class="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                  aria-label="Supprimer"
                  disabled={isClosed}
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              {:else}
                <span class="text-[10px] text-muted-foreground italic">Protégé</span>
              {/if}
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={5} class="py-8 text-center text-muted-foreground text-xs">
              Aucun mouvement de caisse pour cette saison.
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
