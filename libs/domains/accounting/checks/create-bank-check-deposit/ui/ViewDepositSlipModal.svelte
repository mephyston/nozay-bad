<script lang="ts">
  import { Dialog, Button, Table } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
  }

  let { depositState }: Props = $props();
</script>

<Dialog.Root bind:open={depositState.showViewDepositModal}>
  <Dialog.Content class="w-full max-w-3xl p-0 bg-card border-border overflow-hidden">
    <Dialog.Header class="p-6 border-b border-border">
      <Dialog.Title>Bordereau de Remise de Chèques</Dialog.Title>
      <Dialog.Description class="hidden">Aperçu avant impression du bordereau.</Dialog.Description>
    </Dialog.Header>

    {#if depositState.selectedDepositToView}
      <!-- Printable Slip Area -->
      <div class="p-8 overflow-y-auto max-h-[60vh] space-y-6" id="printable-slip">
        <!-- Logo and Club details -->
        <div class="flex justify-between items-start border-b-2 border-primary pb-4">
          <div>
            <h3 class="text-xl font-extrabold text-foreground tracking-tight">NBA 91</h3>
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nozay Badminton Associatif</p>
            <p class="text-[10px] text-muted-foreground">Mairie de Nozay, 91620 Nozay</p>
          </div>
          <div class="text-right">
            <h4 class="text-sm font-bold text-foreground uppercase tracking-wider">Bordereau de Remise</h4>
            <p class="text-xs font-bold mt-1 text-primary">{depositState.selectedDepositToView.reference}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Date : {new Date(depositState.selectedDepositToView.date).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <!-- Bank details summary -->
        <div class="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border border-border text-xs">
          <div>
            <span class="text-muted-foreground font-medium">Bénéficiaire :</span>
            <span class="font-bold text-foreground block mt-0.5">Nozay Badminton Associatif</span>
          </div>
          <div>
            <span class="text-muted-foreground font-medium">Compte de dépôt :</span>
            <span class="font-bold text-foreground block mt-0.5">Compte Courant</span>
          </div>
        </div>

        <!-- Table of checks -->
        <div class="space-y-2">
          <h5 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Liste des chèques ({depositState.checksInViewDeposit.length})</h5>
          <Table.Root class="w-full text-left border-collapse text-xs border border-border">
            <Table.Header>
              <Table.Row class="bg-muted border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                <Table.Head class="py-2.5 px-3 w-10 border-r border-border text-center">N°</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Émetteur</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Banque</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">N° Chèque</Table.Head>
                <Table.Head class="py-2.5 px-3 border-r border-border">Adhérent associé</Table.Head>
                <Table.Head class="py-2.5 px-3 text-right">Montant</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body class="divide-y divide-border">
              {#each depositState.checksInViewDeposit as check, idx}
                <Table.Row class="hover:bg-muted/10 transition-colors">
                  <Table.Cell class="py-2 px-3 border-r border-border text-center font-medium text-muted-foreground">{idx + 1}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border font-semibold text-foreground">{check.emitter}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border">{check.bank || '—'}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border font-medium">{check.number}</Table.Cell>
                  <Table.Cell class="py-2 px-3 border-r border-border">
                    {check.memberName || '—'}
                  </Table.Cell>
                  <Table.Cell class="py-2 px-3 font-semibold text-right text-foreground">
                    {(check.amount / 100).toFixed(2)} €
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="text-center py-8 text-muted-foreground italic">Aucun chèque dans cette remise.</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>

        <!-- Summary Totals & signatures -->
        <div class="grid grid-cols-2 gap-8 pt-4">
          <!-- Totals Box -->
          <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-center space-y-2 h-fit">
            <div class="flex justify-between text-xs">
              <span class="text-muted-foreground font-medium">Nombre de chèques :</span>
              <span class="font-bold text-foreground">{depositState.checksInViewDeposit.length}</span>
            </div>
            <div class="flex justify-between items-center text-sm border-t border-primary/20 pt-2">
              <span class="text-muted-foreground font-bold">MONTANT TOTAL DE LA REMISE :</span>
              <span class="font-black text-primary text-lg">{(depositState.selectedDepositToView.amount / 100).toFixed(2)} €</span>
            </div>
          </div>

          <!-- Signatures area -->
          <div class="border border-border rounded-xl p-4 space-y-8 text-[10px] text-muted-foreground">
            <div class="flex justify-between">
              <span>Signature du trésorier :</span>
              <span>Fait à Nozay, le ___/___/______</span>
            </div>
            <div class="h-8"></div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <Dialog.Footer class="p-6 border-t border-border flex justify-end gap-2 shrink-0">
        <Button
          variant="outline"
          onclick={() => { depositState.showViewDepositModal = false; depositState.selectedDepositToView = null; }}
        >
          Fermer
        </Button>
        <Button
          onclick={() => window.print()}
        >
          Imprimer le Bordereau
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  @media print {
    :global(body) {
      background-color: white !important;
    }
    :global(body *) {
      visibility: hidden !important;
    }
    #printable-slip, #printable-slip * {
      visibility: visible !important;
    }
    #printable-slip {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: white !important;
      color: black !important;
    }
  }
</style>
