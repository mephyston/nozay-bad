<script lang="ts">
  import { Banknote, CheckCircle } from '@lucide/svelte';
  import { Button, Input, Card, FormField, SearchableCombobox, SwitchField, ErrorAlert } from '@nba/ui';
  import type { CashReceiptView } from '../../../shared/cash-store';
  import { cashAction, centsFromInput, euros } from '../../../shared/cash-ui';
  import CashReceiptSigning from './CashReceiptSigning.svelte';

  /**
   * L'encaisseur ouvre un reçu (RF-ACC-003 §3.1-3.2) : payeur, montant, motif. Ouvrir est
   * sa signature ; l'écran passe ensuite à celle du payeur.
   */
  let {
    members = [],
    categories = [],
    collectorName,
    onSealed
  }: {
    members: { id: number; label: string; licence: string }[];
    categories: { id: number; label: string }[];
    collectorName: string;
    /**
     * Un reçu a été scellé et l'encaisseur passe au suivant : la liste de ce qu'il détient
     * a changé. Appelé au « Nouvel encaissement », pas à la signature : recharger aussitôt
     * effaçait la confirmation avant qu'on ait pu la lire.
     */
    onSealed?: () => void;
  } = $props();

  let exterieur = $state(false);
  let memberId = $state('');
  let payerName = $state('');
  let payerEmail = $state('');
  let amount = $state('');
  let categoryId = $state('');
  let description = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);
  let pending = $state<{ receipt: CashReceiptView; qr: string; qrExpiresAt: string } | null>(null);
  let sealed = $state<CashReceiptView | null>(null);

  const memberItems = $derived(members.map((m) => ({ value: String(m.id), label: `${m.label}${m.licence ? ` (${m.licence})` : ''}` })));
  const categoryItems = $derived(categories.map((c) => ({ value: String(c.id), label: c.label })));
  const cents = $derived(centsFromInput(amount));
  const ready = $derived(cents > 0 && !!categoryId && (exterieur ? payerName.trim().length > 0 : !!memberId));

  async function ouvrir(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = null;
    try {
      pending = await cashAction('open_receipt', {
        payerMemberId: exterieur ? null : Number(memberId),
        payerName: exterieur ? payerName.trim() : '',
        payerEmail: exterieur ? payerEmail.trim() || null : null,
        amountCents: cents,
        categoryId: Number(categoryId),
        description: description.trim(),
        collectorName
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue.';
    } finally {
      busy = false;
    }
  }

  function nouveau() {
    if (sealed) onSealed?.();
    sealed = null;
    pending = null;
    memberId = ''; payerName = ''; payerEmail = ''; amount = ''; description = '';
  }
</script>

<Card.Root class="shadow-sm">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <Banknote class="w-5 h-5 text-primary shrink-0" />
    <div>
      <Card.Title class="text-base font-semibold text-foreground">Encaisser des espèces</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">Le reçu n'existe qu'une fois signé par le payeur, sur place.</p>
    </div>
  </Card.Header>
  <Card.Content class="p-4 sm:p-6">
    {#if sealed}
      <div class="flex flex-col items-center gap-3 py-4 text-center" data-testid="cash-receipt-sealed">
        <CheckCircle class="w-10 h-10 text-success" />
        <p class="text-lg font-semibold text-foreground">Reçu n° {sealed.id} signé</p>
        <p class="text-sm text-muted-foreground">{euros(sealed.amountCents)} de {sealed.payerName}. {sealed.payerEmailHint ? 'Son exemplaire part par courriel.' : ''}</p>
        <Button onclick={nouveau}>Nouvel encaissement</Button>
      </div>
    {:else if pending}
      <CashReceiptSigning
        receipt={pending.receipt}
        qr={pending.qr}
        qrExpiresAt={pending.qrExpiresAt}
        onSealed={(r) => { sealed = r; pending = null; }}
        onCancelled={nouveau}
      />
    {:else}
      <form class="space-y-4" onsubmit={ouvrir}>
        {#if error}<ErrorAlert message={error} />{/if}
        <SwitchField id="exterieur" label="Payeur extérieur au club" bind:checked={exterieur} />
        {#if exterieur}
          <div class="grid gap-3 sm:grid-cols-2">
            <FormField id="payer-name" label="Nom du payeur"><Input id="payer-name" bind:value={payerName} required /></FormField>
            <FormField id="payer-email" label="Courriel (facultatif, pour le code et le reçu)"><Input id="payer-email" type="email" bind:value={payerEmail} /></FormField>
          </div>
        {:else}
          <FormField id="payer" label="Adhérent qui paie (ou pour qui l'on paie)">
            <SearchableCombobox id="payer" items={memberItems} bind:value={memberId} />
          </FormField>
        {/if}
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField id="amount" label="Montant (€)"><Input id="amount" inputmode="decimal" bind:value={amount} placeholder="0,00" class="tabular-nums font-semibold" required /></FormField>
          <FormField id="motif" label="Motif"><SearchableCombobox id="motif" items={categoryItems} bind:value={categoryId} /></FormField>
        </div>
        <FormField id="description" label="Précision (facultatif)"><Input id="description" bind:value={description} placeholder="Ex. cotisation de Léa, 2 tubes de volants" /></FormField>
        <Button type="submit" class="w-full" disabled={busy || !ready}>Faire signer le payeur</Button>
      </form>
    {/if}
  </Card.Content>
</Card.Root>
