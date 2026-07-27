<script lang="ts">
  import { Table, Badge, Card, Amount } from '@nba/ui';
  import type { GLTransaction } from './member-profile-types';
  import { categoryLabels } from './member-profile-types';

  let { transactions = [] }: { transactions: GLTransaction[] } = $props();
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
              <Table.Head>Catégorie</Table.Head>
              <Table.Head class="text-right">Montant</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each transactions as tx}
              <Table.Row class="hover:bg-muted/50 transition-colors">
                <Table.Cell class="text-muted-foreground">
                  {tx.date ? new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="secondary">
                    {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Divers'}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-right font-bold">
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
