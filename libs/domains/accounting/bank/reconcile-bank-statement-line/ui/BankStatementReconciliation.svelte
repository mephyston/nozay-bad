<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload } from '@lucide/svelte';
  import { Button, Card, FormField, Alert, Input, SearchableCombobox, ImportResultDialog } from '@nba/ui';
  import { createReconciliationState, type ReconciliationStateProps } from './reconciliation.svelte';
  import ImportStatementDialog from './ImportStatementDialog.svelte';
  import ReconciliationHeader from './ReconciliationHeader.svelte';
  import ReconciliationQueue from './ReconciliationQueue.svelte';

  let props: ReconciliationStateProps = $props();
  // svelte-ignore non_reactive_update
  let state = createReconciliationState(() => props);

  onMount(() => {
    const handleOpen = () => {
      if (!state.isClosed) {
        state.showImportModal = true;
      }
    };
    window.addEventListener('open-bank-import', handleOpen);
    return () => {
      window.removeEventListener('open-bank-import', handleOpen);
    };
  });
</script>

<div class="space-y-6">

  <!-- svelte-ignore non_reactive_update -->
  <ImportStatementDialog bind:state />

  <!-- Le verdict de l'import ; « Continuer » recharge le rapprochement avec les lignes importées. -->
  {#if state.importVerdict}
    <!-- Recréé à chaque verdict : un second échec doit rouvrir le dialogue que le premier a fermé. -->
    {#key state.importVerdict}
    <ImportResultDialog
      open={true}
      success={state.importVerdict.success}
      title={state.importVerdict.success ? 'Relevé importé' : "L'import du relevé a échoué"}
      message={state.importVerdict.message}
      continueHref={`/admin/accounting/reconciliation?season=${encodeURIComponent(state.selectedSeason)}`}
      continueLabel="Ouvrir le rapprochement"
    />
    {/key}
  {/if}

  <!-- svelte-ignore non_reactive_update -->
  <ReconciliationHeader bind:state />

  {#if state.bankStatementLines.length === 0}
    <Card.Root class="p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
      <div class="rounded-full bg-primary/10 p-4 mb-4 text-primary">
        <Upload class="h-8 w-8" />
      </div>
      <h3 class="text-xl font-bold mb-2">Importer un relevé bancaire</h3>
      <p class="text-muted-foreground text-sm max-w-md mb-6">
        Importez votre fichier de relevé bancaire (format OFX ou CSV) exporté depuis votre banque pour démarrer le rapprochement.
      </p>

      <form onsubmit={state.handleImport} class="w-full max-w-md space-y-4">
          <FormField id="bank-file-empty" label="Sélectionner un fichier (OFX / CSV)">
          <Input id="bank-file-empty" type="file" accept=".ofx,.csv" required />
        </FormField>

          <FormField id="bank-account-empty" label="Compte bancaire">
          <SearchableCombobox id="bank-account-empty" items={state.bankAccountItems} bind:value={state.selectedAccount} />
        </FormField>

        {#if state.errorMsg}
          <Alert.Root variant="destructive">
          <Alert.Description>{state.errorMsg}</Alert.Description>
          </Alert.Root>
        {/if}

        <Button type="submit" class="w-full gap-2" disabled={state.isClosed || state.isSubmitting}>
          <Upload class="h-4 w-4" />
          <span>{state.isSubmitting ? 'Importation en cours...' : 'Lancer l\'importation'}</span>
        </Button>
      </form>
    </Card.Root>
  {:else}
    <!--
      Une colonne, et non plus deux.

      Le maître-détail imposait un aller-retour de l'œil à chaque ligne : cliquer à gauche, lire à
      droite, revenir. La décision se prend maintenant là où la ligne se lit — le fait bancaire
      face à sa proposition — et le formulaire ne s'ouvre en place que si on refuse celle-ci.
    -->
    <!-- svelte-ignore non_reactive_update -->
    <ReconciliationQueue bind:state />
  {/if}
</div>
