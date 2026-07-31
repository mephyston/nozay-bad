<script lang="ts">
  import { Button, Dialog, FormField, Alert, Select, Input } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state = $bindable() }: { state: ReconciliationState } = $props();
</script>

<Dialog.Root bind:open={state.showImportModal}>
  <Dialog.Content class="max-w-md p-6 bg-card border-border shadow-xl">
    <Dialog.Header>
      <Dialog.Title class="text-xl font-bold">Importer un relevé Société Générale</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground mt-1">
        Sélectionnez votre fichier d'export bancaire (OFX ou CSV) pour charger automatiquement les écritures.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={state.handleImport} class="space-y-4 mt-4">
        <FormField id="bank-file" label="Fichier de relevé bancaire">
        <Input id="bank-file" type="file" accept=".ofx,.csv" required />
      </FormField>

        <FormField id="bank-account" label="Compte bancaire cible">
        <Select
          id="bank-account"
          bind:value={state.selectedAccount}
        >
          <option value="auto">Détection automatique depuis le fichier</option>
          <option value="current">Compte Courant</option>
          <option value="savings">Compte Livret</option>
          <option value="cash">Caisse Physique</option>
        </Select>
      </FormField>

      {#if state.errorMsg}
        <Alert.Root variant="destructive">
        <Alert.Description>{state.errorMsg}</Alert.Description>
        </Alert.Root>
      {/if}

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onclick={() => state.showImportModal = false}>
          Annuler
        </Button>
        <Button type="submit" disabled={state.isSubmitting}>
          {state.isSubmitting ? 'Importation en cours...' : 'Lancer l\'importation'}
        </Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
