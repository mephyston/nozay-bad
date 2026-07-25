<script lang="ts">
  import { CheckCircle, MoreVertical, FileText, Trash2 } from '@lucide/svelte';
  import { Button, Table, Badge, Card, Amount } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { CheckDeposit } from './check-deposit-types';

  interface Props {
    depositState: CheckDepositState;
    checkDeposits: CheckDeposit[];
    onDeleteDeposit: (id: number) => Promise<void>;
  }

  let { depositState, checkDeposits, onDeleteDeposit }: Props = $props();
</script>

<Card.Root class="shadow-sm">
  <Card.Content class="p-0">
    <div class="overflow-x-auto min-h-[300px] pb-24">
      <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
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
          {#each checkDeposits as dep, index}
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
                <div class="relative inline-block text-left font-normal">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onclick={(e) => depositState.toggleDropdown(`deposit-${dep.id}`, e)} 
                    class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                    aria-label="Actions"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </Button>

                  {#if depositState.openDropdownId === `deposit-${dep.id}`}
                    <div class="absolute right-0 {checkDeposits.length <= 2 || index >= checkDeposits.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'} w-48 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 text-left divide-y divide-border animate-in fade-in duration-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => {
                          depositState.selectedDepositToView = dep;
                          depositState.showViewDepositModal = true;
                        }}
                        class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                      >
                        <FileText class="w-3.5 h-3.5" />
                        Consulter / Imprimer
                      </Button>
                      
                      {#if dep.status !== 'cleared' && !depositState.isClosed}
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={() => {
                            depositState.selectedDepositToClear = dep;
                            depositState.showClearModal = true;
                          }}
                          class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-primary hover:bg-primary/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                        >
                          <CheckCircle class="w-3.5 h-3.5" />
                          Rapprocher (SG)
                        </Button>
                      {/if}

                      {#if !depositState.isClosed}
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={() => onDeleteDeposit(dep.id)}
                          class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                          Supprimer la remise
                        </Button>
                      {/if}
                    </div>
                  {/if}
                </div>
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
