<script lang="ts">
  import { ErrorAlert, PageHeader, ResponsiveSheet } from '@nba/ui';
  import { CashReceiptDesk, HeldCashReceipts, CashInHandBoard, HandoverSigning } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * L'encaissement d'espèces (RF-ACC-003) : le bureau de l'encaisseur, ce qu'il détient,
   * et, pour le trésorier, les espèces en circulation et la remise.
   *
   * Après une signature, l'écran se recharge pour que les montants détenus suivent.
   */
  let errorMsg = $state<string | null>(null);
  let version = $state(0);
  let remise = $state<{ handover: any; collectorName: string } | null>(null);
  const recharger = () => (version += 1);
</script>

<PageHeader title="Espèces" description="Encaisser au gymnase contre un reçu signé par le payeur, puis remettre au trésorier." />

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

{#key version}
  <EcranDistant domaine="accounting" ecran="especes" variante="grille" onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}>
    {#snippet pret(d)}
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <CashReceiptDesk members={d.members} categories={d.categories} collectorName={d.collectorName} onSealed={recharger} />
        <div class="space-y-6">
          <HeldCashReceipts receipts={d.held.receipts} totalCents={d.held.totalCents} onHandedOver={recharger} />
          {#if d.canReceive}
            <CashInHandBoard lines={d.cashInHand} categories={d.gapCategories} onOpened={(handover, collectorName) => (remise = { handover, collectorName })} />
          {/if}
        </div>
      </div>
    {/snippet}
  </EcranDistant>
{/key}

<ResponsiveSheet
  open={remise !== null}
  onOpenChange={(o) => { if (!o) { remise = null; recharger(); } }}
  title="Remise d'espèces"
  description={remise ? `${remise.collectorName} signe la remise.` : ''}
>
  {#if remise}
    <HandoverSigning handover={remise.handover} collectorName={remise.collectorName} onDone={() => { remise = null; recharger(); }} />
  {/if}
</ResponsiveSheet>
