<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload } from '@lucide/svelte';
  import { Button, Card, FormField, Alert } from '@nba/ui';
  import { createReconciliationState, type ReconciliationStateProps } from './reconciliation.svelte';
  import ImportStatementDialog from './ImportStatementDialog.svelte';
  import ReconciliationHeader from './ReconciliationHeader.svelte';
  import BankStatementLinesList from './BankStatementLinesList.svelte';
  import ReconciliationDetailPanel from './ReconciliationDetailPanel.svelte';

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

  <!-- svelte-ignore non_reactive_update -->
  <ReconciliationHeader bind:state />

  {#if state.bankStatementLines.length === 0}
    <Card.Root class="p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
      <div class="rounded-full bg-primary/10 p-4 mb-4 text-primary">
        <Upload class="h-8 w-8" />
      </div>
      <h3 class="text-xl font-bold mb-2">Importer un relevé Société Générale</h3>
      <p class="text-muted-foreground text-sm max-w-md mb-6">
        Importez votre fichier de relevé bancaire (format OFX ou CSV) exporté depuis votre banque pour démarrer le rapprochement.
      </p>

      <form onsubmit={state.handleImport} class="w-full max-w-md space-y-4">
          <FormField id="bank-file-empty" label="Sélectionner un fichier (OFX / CSV)">
          <input
            id="bank-file-empty"
            type="file"
            accept=".ofx,.csv"
            required
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </FormField>

          <FormField id="bank-account-empty" label="Compte bancaire">
          <select
            id="bank-account-empty"
            bind:value={state.selectedAccount}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="auto">Détection automatique depuis le fichier</option>
            <option value="current">Compte Courant</option>
            <option value="savings">Compte Livret</option>
            <option value="cash">Caisse Physique</option>
          </select>
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
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-5 {state.selectedTx ? 'hidden lg:block' : 'block'}">
        <!-- svelte-ignore non_reactive_update -->
        <BankStatementLinesList bind:state />
      </div>

      <div class="lg:col-span-7 {state.selectedTx ? 'block' : 'hidden lg:block'}">
        <!-- svelte-ignore non_reactive_update -->
        <ReconciliationDetailPanel bind:state />
      </div>
    </div>
  {/if}
</div>
