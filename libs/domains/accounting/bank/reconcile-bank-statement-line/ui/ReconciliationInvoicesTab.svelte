<script lang="ts">
  import { FileText, Sparkles } from '@lucide/svelte';
  import { Button, Amount, Badge } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /*
    La prop est renommée `reconState`, et ce n'est pas une coquetterie.

    Déclarée `state`, elle capture la rune : Svelte lit `$state(false)` comme
    l'auto-abonnement du store `state` et échoue avec « `state` is not a store with a
    `subscribe` method ». `ReconciliationLinkedEntries` porte le même renommage, pour la
    même raison.
  */
  let { state: reconState = $bindable(), selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();

  /* Replié par défaut : la plupart des lignes de relevé ne règlent aucune facture, et l'écran
     n'a pas à leur imposer la liste des impayées. */
  let isOpen = $state(false);

  const selectedCount = $derived(reconState.selectedInvoiceIds.size);
  const matchesExactly = $derived(Math.abs(reconState.selectedSum - Math.abs(selectedTx.amount)) <= 10);
</script>

<div class="mb-4 rounded-lg border border-border bg-muted/20">
  <button
    type="button"
    class="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/40 rounded-lg cursor-pointer"
    onclick={() => (isOpen = !isOpen)}
  >
    <span class="flex items-center gap-2">
      <FileText class="h-3.5 w-3.5" />
      <span>Reprendre une facture impayée ({reconState.unpaidInvoices.length})</span>
      {#if reconState.matchingInvoices.length > 0}
        <Badge variant="success" size="xs" class="gap-1">
          <Sparkles class="h-3 w-3" />
          <span>{reconState.matchingInvoices.length} au montant exact</span>
        </Badge>
      {/if}
    </span>
    <span class="text-base leading-none">{isOpen ? '−' : '+'}</span>
  </button>

  {#if isOpen}
    <div class="p-3 pt-0 space-y-3">
      <!--
        Choisir une facture ne rapproche rien : cela remplit le formulaire ci-dessous.

        L'écran écrivait ici directement une recette, avec la catégorie « Adhésions &
        Inscriptions » codée en dur et un règlement figé sur « virement ». Sur plusieurs factures
        il n'en écrivait qu'une, ne rattachant que la première — les autres passaient payées sans
        aucune écriture pour les porter. Une facture prérremplit désormais une ventilation, une
        part par facture, que la comptable relit et corrige avant de valider.
      -->
      <p class="text-[11px] text-muted-foreground italic">
        La sélection remplit l'écriture ci-dessous — une part par facture. Rien n'est enregistré
        avant votre validation.
      </p>

      <div class="rounded-lg border border-border divide-y divide-border bg-card max-h-[260px] overflow-y-auto">
        {#each reconState.unpaidInvoices as inv (inv.id)}
          {@const isExact = Math.abs(inv.totalAmount - Math.abs(selectedTx.amount)) <= 10}
          <label class="p-2.5 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors cursor-pointer">
            <span class="flex items-center gap-2.5">
              <input
                type="checkbox"
                class="invoice-checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
                checked={reconState.selectedInvoiceIds.has(inv.id)}
                onchange={() => reconState.toggleInvoiceSelection(inv.id)}
              />
              <span>
                <span class="font-medium block">{inv.clientName}</span>
                <span class="text-[11px] text-muted-foreground">{inv.invoiceNumber} • {inv.date}</span>
                {#if inv.categoryBreakdown && inv.categoryBreakdown.length > 0}
                  <span class="text-[11px] text-muted-foreground block">
                    {inv.categoryBreakdown
                      .map((p) => reconState.categories.find((c) => c.id === String(p.categoryId))?.name ?? 'Catégorie à choisir')
                      .join(' · ')}
                  </span>
                {:else}
                  <span class="text-[11px] text-warning block">Aucune imputation : à choisir</span>
                {/if}
              </span>
            </span>

            <span class="flex items-center gap-2 shrink-0">
              {#if isExact}
                <Badge variant="success" size="xs">Montant exact</Badge>
              {/if}
              <Amount cents={inv.totalAmount} class="font-semibold" />
            </span>
          </label>
        {/each}
      </div>

      {#if selectedCount > 0}
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <span>Total sélectionné :</span>
            <Amount cents={reconState.selectedSum} />
            <span>/</span>
            <Amount cents={Math.abs(selectedTx.amount)} />
            {#if !matchesExactly}
              <span class="text-warning">— écart</span>
            {/if}
          </span>

          <Button
            id="btn-valider-association"
            size="sm"
            class="text-xs"
            disabled={reconState.isClosed || reconState.isSubmitting}
            onclick={() => reconState.prefillFromInvoices(Array.from(reconState.selectedInvoiceIds))}
          >
            Reprendre {selectedCount} facture{selectedCount > 1 ? 's' : ''}
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>
