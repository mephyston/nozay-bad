<script lang="ts">
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateLedgerEntryFromBankLine from './CreateLedgerEntryFromBankLine.svelte';
  import ReconciliationLinkedEntries from './ReconciliationLinkedEntries.svelte';
  import ReconciliationInvoicesTab from './ReconciliationInvoicesTab.svelte';
  import ReconciliationNaturePicker from './ReconciliationNaturePicker.svelte';
  import InternalTransferForm from './InternalTransferForm.svelte';
  import MemberAdvanceForm from './MemberAdvanceForm.svelte';
  import { libelleDEnregistrement, naturesDeLigne } from './reconciliation-natures';
  import { parseSuggestion } from './reconciliation-suggestion';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state`. */
  let {
    state: reconState = $bindable(),
    line
  }: { state: ReconciliationState; line: BankStatementLine } = $props();

  const sug = $derived(line.status === 'pending' ? parseSuggestion(line) : null);

  /*
    Quels champs portent **encore** la valeur proposée.

    C'est la comparaison, et non la simple présence d'une suggestion, qui fait sens : corriger un
    champ doit en éteindre le liseré. L'encart violet ne savait pas le dire — il répétait la
    proposition figée, quoi qu'on ait saisi.
  */
  const aiFields = $derived({
    category: !!sug && sug.category != null && reconState.category === String(sug.category),
    member: !!sug && sug.memberId != null && reconState.selectedMemberId === String(sug.memberId),
    accrual: !!sug && !!sug.accrualType && sug.accrualType !== 'normal' && reconState.accrualType === sug.accrualType,
    season: !!sug && !!sug.targetSeason && reconState.targetSeasonId === sug.targetSeason,
    /* La note est le seul champ libre que le modèle remplit : elle se signale comme les autres. */
    note: !!sug && !!sug.accrualNote && reconState.accrualNote === sug.accrualNote
  });

  const aiHint = $derived(
    sug && sug.kind !== 'internal-transfer' && (sug.confidence || sug.reason)
      ? { confidence: sug.confidence, reason: sug.reason }
      : null
  );

  /*
    Une seule question en tête, puis le formulaire de la réponse.

    Les deux onglets, le bloc des factures replié en haut de l'un, l'interrupteur de
    remboursement au milieu du formulaire et les deux dialogues ouverts depuis la ligne
    disaient chacun une façon de traiter la ligne, chacun à sa manière. Ce sont désormais
    les options d'un même choix. Une nature qui n'est plus offerte — la dernière facture
    vient d'être payée — retombe sur la saisie, plutôt que de laisser un formulaire orphelin.
  */
  const options = $derived(line.status === 'pending' ? naturesDeLigne(line, reconState.contexteDeNature(line)) : []);
  const nature = $derived(options.some((o) => o.nature === reconState.nature) ? reconState.nature : 'saisie');
  const libelleBouton = $derived(libelleDEnregistrement(nature, line));
</script>

{#snippet formulaireDeSaisie()}
  <CreateLedgerEntryFromBankLine
    selectedTx={line}
    remainingAmount={reconState.remainingAmount}
    bind:category={reconState.category}
    bind:selectedMemberId={reconState.selectedMemberId}
    bind:accrualType={reconState.accrualType}
    bind:accrualNote={reconState.accrualNote}
    isSubmitting={reconState.isSubmitting}
    handleCreateAndMatch={reconState.handleCreateAndMatch}
    bind:isSplitMode={reconState.isSplitMode}
    isRefund={nature === 'remboursement'}
    {libelleBouton}
    bind:splits={reconState.splits}
    addSplitRow={reconState.addSplitRow}
    removeSplitRow={reconState.removeSplitRow}
    categories={reconState.categories}
    sortedMembers={reconState.sortedMembers}
    seasons={reconState.seasons}
    bind:targetSeasonId={reconState.targetSeasonId}
    {aiHint}
    {aiFields}
    isAnalyzing={reconState.isAnalyzingSingle}
    onReanalyze={() => reconState.handleAnalyzeSingle(line.id)}
    bind:isMemberDropdownOpen={reconState.isMemberDropdownOpen}
    bind:isCategoryDropdownOpen={reconState.isCategoryDropdownOpen}
    bind:memberSearchQuery={reconState.memberSearchQuery}
    bind:categorySearchQuery={reconState.categorySearchQuery}
  />
{/snippet}

<div class="space-y-5">
  <ReconciliationLinkedEntries state={reconState} selectedTx={line} />

  <!--
    Les outils de rapprochement ne s'affichent que sur une ligne qui en attend un.

    Sur une ligne déjà rapprochée, ce bloc montrait un formulaire de **création** prérempli par la
    suggestion du modèle — pas par l'écriture enregistrée, qu'il ne lit pas et n'a jamais lue. Ce
    qui a été enregistré se lit au-dessus, dans les écritures liées.
  -->
  {#if line.status !== 'pending'}
    <p class="text-xs text-muted-foreground">
      Cette ligne est rapprochée : les écritures ci-dessus font foi. Pour la modifier, dissociez
      l'écriture concernée.
    </p>
  {:else}
    <ReconciliationNaturePicker
      {options}
      value={nature}
      name="nature-{line.id}"
      disabled={reconState.isClosed}
      onChoose={(n) => reconState.choisirNature(n)}
    />

    <div class="border-t border-border pt-5">
      {#if nature === 'pointer'}
        <!--
          Toutes les props déclarées sont passées, et aucune de plus. Une prop mal nommée n'échoue
          pas : elle arrive `undefined`, et le bouton ne fait rien sans que rien ne le signale.
        -->
        <MatchTransaction
          selectedTx={line}
          isClosed={reconState.isClosed}
          isSubmitting={reconState.isSubmitting}
          suggestions={reconState.suggestions}
          glTransactions={reconState.pointableEntries}
          sortedMembers={reconState.sortedMembers}
          bind:selectedMemberId={reconState.selectedMemberId}
          onMatch={(glTxId) => reconState.handleMatch(line.id, glTxId)}
        />
      {:else if nature === 'virement'}
        <InternalTransferForm
          state={reconState}
          {line}
          onConfirm={(accountId, description) => reconState.handleInternalTransfer(line, accountId, description)}
        />
      {:else if nature === 'avance'}
        <MemberAdvanceForm
          {line}
          isSubmitting={reconState.isSubmitting}
          isClosed={reconState.isClosed}
          onConfirm={(description) => reconState.handleMemberTransfer(line, description)}
        />
      {:else if nature === 'facture'}
        <div class="space-y-5">
          <ReconciliationInvoicesTab state={reconState} selectedTx={line} />
          <!-- L'écriture de règlement n'apparaît qu'une fois les factures reprises : avant, elle n'a rien à dire. -->
          {#if reconState.splits.length > 0}
            {@render formulaireDeSaisie()}
          {/if}
        </div>
      {:else}
        {@render formulaireDeSaisie()}
      {/if}
    </div>
  {/if}
</div>
