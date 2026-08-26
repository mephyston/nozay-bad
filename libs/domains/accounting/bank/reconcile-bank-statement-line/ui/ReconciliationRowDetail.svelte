<script lang="ts">
  import { Tabs } from '@nba/ui';
  import MatchTransaction from './MatchTransaction.svelte';
  import CreateLedgerEntryFromBankLine from './CreateLedgerEntryFromBankLine.svelte';
  import ReconciliationAiSuggestion from './ReconciliationAiSuggestion.svelte';
  import ReconciliationLinkedEntries from './ReconciliationLinkedEntries.svelte';
  import ReconciliationInvoicesTab from './ReconciliationInvoicesTab.svelte';
  import { parseSuggestion } from './reconciliation-suggestion';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state`. */
  let {
    state: reconState = $bindable(),
    line
  }: { state: ReconciliationState; line: BankStatementLine } = $props();

  /* Mémoïsé : ce décompte vivait dans un libellé d'onglet, donc rebalayait tout le grand livre à
     chaque invalidation du panneau. */
  const unpointedCount = $derived(reconState.pointableEntries.length);

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
</script>

<div class="space-y-5">
  <!--
    L'encart ne subsiste que pour le virement interne.

    Ce n'est pas une proposition mais un refus : cet écran ne sait écrire qu'une jambe là où il en
    faut deux, et l'explication ne peut donc pas se réduire à un liseré sur un champ. Le reste de
    la proposition se lit désormais dans les champs eux-mêmes, cerclés de violet tant qu'ils la
    portent.
  -->
  {#if sug?.kind === 'internal-transfer'}
    <ReconciliationAiSuggestion state={reconState} selectedTx={line} />
  {/if}

  <ReconciliationLinkedEntries state={reconState} selectedTx={line} />

  <!--
    Les outils de rapprochement ne s'affichent que sur une ligne qui en attend un.

    Sur une ligne déjà rapprochée, ce bloc montrait un formulaire de **création** prérempli par la
    suggestion du modèle — pas par l'écriture enregistrée, qu'il ne lit pas et n'a jamais lue. Le
    rattachement d'exercice y revenait donc à « Normal », ce qui se lit comme une saisie perdue
    alors que rien ne l'était. Ce qui a été enregistré se lit au-dessus, dans les écritures liées.
  -->
  {#if line.status !== 'pending'}
    <p class="text-xs text-muted-foreground">
      {line.status === 'reconciled'
        ? "Cette ligne est rapprochée : les écritures ci-dessus font foi. Pour la modifier, dissociez l'écriture concernée."
        : 'Cette ligne est ignorée. Rétablissez-la pour la rapprocher.'}
    </p>
  {:else}
    <Tabs.Root value={reconState.activeRightTab} onValueChange={(v) => (reconState.activeRightTab = v as any)} class="w-full">
      <Tabs.List class="flex w-full justify-start sm:justify-center overflow-x-auto no-scrollbar mb-4">
        <Tabs.Trigger value="manual" class="text-xs cursor-pointer">Saisir / ventiler</Tabs.Trigger>
        <Tabs.Trigger value="ledger" class="text-xs cursor-pointer">
          Pointer une écriture ({unpointedCount})
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="manual">
        <ReconciliationInvoicesTab state={reconState} selectedTx={line} />

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
          bind:splits={reconState.splits}
          addSplitRow={reconState.addSplitRow}
          removeSplitRow={reconState.removeSplitRow}
          categories={reconState.categories}
          sortedMembers={reconState.sortedMembers}
          seasons={reconState.seasons}
          bind:targetSeasonId={reconState.targetSeasonId}
          browsedSeason={reconState.selectedSeason}
          {aiHint}
          {aiFields}
          isAnalyzing={reconState.isAnalyzingSingle}
          onReanalyze={() => reconState.handleAnalyzeSingle(line.id)}
          bind:isMemberDropdownOpen={reconState.isMemberDropdownOpen}
          bind:isCategoryDropdownOpen={reconState.isCategoryDropdownOpen}
          bind:memberSearchQuery={reconState.memberSearchQuery}
          bind:categorySearchQuery={reconState.categorySearchQuery}
        />
      </Tabs.Content>

      <Tabs.Content value="ledger">
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
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</div>
