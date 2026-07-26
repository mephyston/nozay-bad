<script lang="ts">
  import { CheckCircle, MoreVertical, FileText, Trash2 } from '@lucide/svelte';
  import { Button, Table, Badge, Card, Amount, DropdownMenu } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { CheckDeposit } from './check-deposit-types';

  interface Props {
    depositState: CheckDepositState;
    checkDeposits: CheckDeposit[];
    onDeleteDeposit: (id: number) => Promise<void>;
  }

  let { depositState, checkDeposits, onDeleteDeposit }: Props = $props();
</script>

<Card.Root class="overflow-hidden shadow-sm">
  <Card.Content class="p-0">
    <div class="overflow-x-auto min-h-[220px]">
      <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header>
          <Table.Row>
            <Table.Head class="p-4">Date de dépôt</Table.Head>
            <Table.Head class="p-4">Référence</Table.Head>
            <Table.Head class="p-4">Statut</Table.Head>
            <Table.Head class="p-4 text-right">Montant Total</Table.Head>
            <Table.Head class="p-4">Rapprochement Bancaire</Table.Head>
            <Table.Head class="p-4 text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each checkDeposits as dep}
            <Table.Row class="hover:bg-muted/50 transition-colors">
              <Table.Cell class="p-4 text-muted-foreground">
                {new Date(dep.date).toLocaleDateString('fr-FR')}
              </Table.Cell>
              <Table.Cell class="p-4 font-medium">{dep.reference}</Table.Cell>
              <Table.Cell class="p-4">
                {#if dep.status === 'cleared'}
                  <Badge variant="outline" class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
                    <CheckCircle class="h-3 w-3" /> Rapproché
                  </Badge>
                {:else}
                  <Badge variant="outline" class="inline-flex items-center gap-1 bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                    Déposé
                  </Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4 text-right font-bold text-foreground">
                <Amount cents={(dep as any).amountCents ?? dep.amount} />
              </Table.Cell>
              <Table.Cell class="p-4">
                {#if dep.status === 'cleared'}
                  <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle class="w-3.5 h-3.5" />
                    Rapproché (SG #{dep.bankStatementLineId})
                  </span>
                {:else}
                  <span class="text-xs text-muted-foreground italic font-medium">Non rapproché</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4 text-right">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    {#snippet child({ props })}
                      <Button 
                        {...props}
                        variant="ghost"
                        size="icon"
                        class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                        aria-label="Actions"
                      >
                        <MoreVertical class="w-4 h-4" />
                        <span class="sr-only">Toggle menu</span>
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Content class="w-48" align="end">
                    <DropdownMenu.Item
                      onclick={() => {
                        depositState.selectedDepositToView = dep;
                        depositState.showViewDepositModal = true;
                      }}
                      class="cursor-pointer"
                    >
                      <FileText class="w-3.5 h-3.5 mr-2" />
                      Consulter / Imprimer
                    </DropdownMenu.Item>
                    
                    {#if dep.status !== 'cleared' && !depositState.isClosed}
                      <DropdownMenu.Item
                        onclick={() => {
                          depositState.selectedDepositToClear = dep;
                          depositState.showClearModal = true;
                        }}
                        class="text-primary focus:text-primary cursor-pointer"
                      >
                        <CheckCircle class="w-3.5 h-3.5 mr-2" />
                        Rapprocher (SG)
                      </DropdownMenu.Item>
                    {/if}

                    {#if !depositState.isClosed}
                      <DropdownMenu.Item
                        onclick={() => onDeleteDeposit(dep.id)}
                        class="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 class="w-3.5 h-3.5 mr-2" />
                        Supprimer la remise
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={6} class="text-center py-12 text-muted-foreground">
                <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                Aucun bordereau de remise enregistré.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
