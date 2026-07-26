<script lang="ts">
  import { Search, Link, MoreHorizontal, Trash2, FileText } from '@lucide/svelte';
  import { Button, Table, Input, Card, Checkbox, Amount, DropdownMenu } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    onDeleteCheck: (id: number) => Promise<void>;
  }

  let { depositState, seasonId, onDeleteCheck }: Props = $props();
</script>

<div class="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-2">
  <div class="relative w-full sm:w-96">
    <Input
      type="text"
      placeholder="Rechercher par numéro, émetteur, banque, adhérent..."
      bind:value={depositState.checkSearchQuery}
      class="pl-9 pr-8 bg-background border-border"
    />
    <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
    {#if depositState.checkSearchQuery}
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
        onclick={() => depositState.checkSearchQuery = ''}
      >
        ✕
      </button>
    {/if}
  </div>
</div>

<Card.Root class="overflow-hidden shadow-sm">
  <Card.Content class="p-0">
    <div class="overflow-x-auto min-h-[180px]">
      <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-10">
              <Checkbox
                checked={depositState.filteredChecks.length > 0 && depositState.filteredChecks.every(c => depositState.selectedCheckIds[c.id])}
                onCheckedChange={(val) => {
                  const checked = !!val;
                  depositState.filteredChecks.forEach(c => depositState.selectedCheckIds[c.id] = checked);
                }}
                disabled={depositState.isClosed}
              />
            </Table.Head>
            <Table.Head>Date de réception</Table.Head>
            <Table.Head>N° Chèque</Table.Head>
            <Table.Head>Banque</Table.Head>
            <Table.Head>Émetteur</Table.Head>
            <Table.Head>Adhérent associé</Table.Head>
            <Table.Head class="text-right">Montant</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each depositState.filteredChecks as check}
            <Table.Row>
              <Table.Cell>
                <Checkbox
                  checked={!!depositState.selectedCheckIds[check.id]}
                  onCheckedChange={(val) => {
                    depositState.selectedCheckIds[check.id] = !!val;
                  }}
                  disabled={depositState.isClosed}
                />
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">
                {new Date(check.createdAt).toLocaleDateString('fr-FR')}
              </Table.Cell>
              <Table.Cell class="font-medium">{check.number}</Table.Cell>
              <Table.Cell>{check.bank || '—'}</Table.Cell>
              <Table.Cell class="font-medium">{check.emitter}</Table.Cell>
              <Table.Cell>
                {#if check.memberId && check.memberName}
                  <a
                    href={`/admin/members/${check.memberLicence}?season=${seasonId}`}
                    class="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                  >
                    <Link class="h-3 w-3" />
                    {check.memberName}
                  </a>
                {:else}
                  <span class="text-xs text-muted-foreground italic">Non associé</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right font-bold text-foreground">
                <Amount cents={(check as any).amountCents ?? check.amount} />
              </Table.Cell>
              <Table.Cell class="text-right">
                {#if !depositState.isClosed}
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
                      <DropdownMenu.Item
                        onclick={() => onDeleteCheck(check.id)}
                        class="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 class="w-3.5 h-3.5 mr-2" />
                        Supprimer
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                {:else}
                  <span class="text-xs text-muted-foreground italic">Aucune</span>
                {/if}
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={8} class="text-center py-12 text-muted-foreground">
                <FileText class="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                Aucun chèque en attente pour cette saison.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
