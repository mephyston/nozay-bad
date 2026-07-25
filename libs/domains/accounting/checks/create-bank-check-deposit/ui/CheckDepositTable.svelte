<script lang="ts">
  import { Search, Link, MoreVertical, Trash2, FileText } from '@lucide/svelte';
  import { Button, Table, Input, Card, Checkbox, Amount } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    onDeleteCheck: (id: number) => Promise<void>;
  }

  let { depositState, seasonId, onDeleteCheck }: Props = $props();
</script>

<Card.Root class="shadow-sm">
  <Card.Content class="p-0">
    <div class="p-3 border-b border-border bg-muted/40">
      <div class="relative">
        <Input
          type="text"
          placeholder="Rechercher par numéro, émetteur, banque, adhérent..."
          bind:value={depositState.checkSearchQuery}
          class="h-8 text-xs pl-3 pr-8"
        />
        {#if depositState.checkSearchQuery}
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            onclick={() => depositState.checkSearchQuery = ''}
          >
            ✕
          </button>
        {/if}
      </div>
    </div>

    <div class="overflow-x-auto min-h-[300px] pb-24">
      <Table.Root class="w-full text-left border-collapse text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
          <Table.Row>
            <Table.Head class="p-4 w-10">
              <Checkbox
                checked={depositState.filteredChecks.length > 0 && depositState.filteredChecks.every(c => depositState.selectedCheckIds[c.id])}
                onCheckedChange={(val) => {
                  const checked = !!val;
                  depositState.filteredChecks.forEach(c => depositState.selectedCheckIds[c.id] = checked);
                }}
                disabled={depositState.isClosed}
              />
            </Table.Head>
            <Table.Head class="p-4">Date de réception</Table.Head>
            <Table.Head class="p-4">N° Chèque</Table.Head>
            <Table.Head class="p-4">Banque</Table.Head>
            <Table.Head class="p-4">Émetteur</Table.Head>
            <Table.Head class="p-4">Adhérent associé</Table.Head>
            <Table.Head class="p-4 text-right">Montant</Table.Head>
            <Table.Head class="p-4 text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each depositState.filteredChecks as check}
            <Table.Row class="hover:bg-muted/50 transition-colors">
              <Table.Cell class="p-4">
                <Checkbox
                  checked={!!depositState.selectedCheckIds[check.id]}
                  onCheckedChange={(val) => {
                    depositState.selectedCheckIds[check.id] = !!val;
                  }}
                  disabled={depositState.isClosed}
                />
              </Table.Cell>
              <Table.Cell class="p-4 text-muted-foreground">
                {new Date(check.createdAt).toLocaleDateString('fr-FR')}
              </Table.Cell>
              <Table.Cell class="p-4 font-medium">{check.number}</Table.Cell>
              <Table.Cell class="p-4">{check.bank || '—'}</Table.Cell>
              <Table.Cell class="p-4 font-medium">{check.emitter}</Table.Cell>
              <Table.Cell class="p-4">
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
              <Table.Cell class="p-4 text-right font-bold text-foreground">
                <Amount cents={(check as any).amountCents ?? check.amount} />
              </Table.Cell>
              <Table.Cell class="p-4 text-right relative">
                {#if !depositState.isClosed}
                  <div class="inline-block text-left">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onclick={(e) => depositState.toggleDropdown(`check-${check.id}`, e)} 
                      class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center inline-flex" 
                      aria-label="Actions"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </Button>

                    {#if depositState.openDropdownId === `check-${check.id}`}
                      <div class="absolute right-4 top-full mt-1 w-32 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 text-left divide-y divide-border animate-in fade-in duration-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={() => onDeleteCheck(check.id)}
                          class="w-full justify-start rounded-none px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                          Supprimer
                        </Button>
                      </div>
                    {/if}
                  </div>
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
