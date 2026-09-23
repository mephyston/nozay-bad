<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { TreasuryConfig } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';
  import { oublierIdentite } from '../lib/identite';

  /** L'écran « Comptes et moyens de paiement », en coquille : ses données viennent du relais `accounting/treasury`. */
  let { sansEntete = false }: {
    /** Monté dans un tiroir : celui-ci porte déjà le titre et la description. */
    sansEntete?: boolean;
  } = $props();

  let errorMsg = $state<string | null>(null);
</script>

{#if !sansEntete}
  <PageHeader
    title="Comptes et moyens de paiement"
    description="Les comptes de trésorerie du club — banque, caisses, porte-monnaie — et ce qu'il accepte comme règlement. Sans compte bancaire actif, la comptabilité reste fermée."
  />
{/if}

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class={sansEntete ? '' : 'mt-6'}>
  <EcranDistant domaine="accounting" ecran="treasury" variante="liste" onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}>
    {#snippet pret(d)}
      <TreasuryConfig accounts={d.accounts ?? []} paymentMethods={d.paymentMethods ?? []} accountClasses={d.accountClasses ?? []} canWrite={d.canWrite ?? false} onSaved={oublierIdentite} />
    {/snippet}
  </EcranDistant>
</div>
