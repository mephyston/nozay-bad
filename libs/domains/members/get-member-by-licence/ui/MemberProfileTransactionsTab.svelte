<script lang="ts">
  import { ShoppingBag, Undo2, ArrowLeftRight } from '@lucide/svelte';
  import { Table, Badge, Card, Amount } from '@nba/ui';
  import type { GLTransaction } from './member-profile-types';
  import { categoryLabels } from './member-profile-types';

  let { transactions = [] }: { transactions: GLTransaction[] } = $props();

  // Le sens est lu du point de vue de l'adhérent : une recette du club est un achat
  // de l'adhérent, une dépense du club est un remboursement qui lui est versé.
  function direction(type: GLTransaction['type']) {
    if (type === 'recette') return { label: 'Achat', icon: ShoppingBag, tone: 'text-foreground' };
    if (type === 'depense') return { label: 'Remboursement', icon: Undo2, tone: 'text-success' };
    return { label: 'Transfert', icon: ArrowLeftRight, tone: 'text-muted-foreground' };
  }
</script>

<Card.Root class="space-y-4">
  <Card.Content class="p-6 space-y-4">
    <h3 class="font-bold text-lg border-b border-border pb-2 text-foreground">
      Écritures associées au Grand Livre
    </h3>
    
    {#if transactions.length === 0}
      <p class="text-sm text-muted-foreground italic p-4 text-center">Aucune transaction enregistrée pour cet adhérent.</p>
    {:else}
      <div class="overflow-x-auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Catégorie</Table.Head>
              <Table.Head class="text-right">Montant</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each transactions as tx}
              {@const dir = direction(tx.type)}
              {@const DirIcon = dir.icon}
              <Table.Row class="hover:bg-muted/50 transition-colors">
                <Table.Cell class="text-muted-foreground whitespace-nowrap">
                  {tx.date ? new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                </Table.Cell>
                <Table.Cell>
                  <!-- Sur mobile l'icône seule tient la colonne ; le libellé reste
                       disponible pour les lecteurs d'écran et réapparaît dès sm. -->
                  <span class={`inline-flex items-center gap-1.5 whitespace-nowrap ${dir.tone}`}>
                    <DirIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span class="hidden sm:inline text-xs font-medium">{dir.label}</span>
                    <span class="sr-only sm:hidden">{dir.label}</span>
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="secondary">
                    {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Divers'}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-right font-bold whitespace-nowrap">
                  <Amount cents={(tx as any).amountCents ?? tx.amount} showSign colored />
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
