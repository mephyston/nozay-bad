<script lang="ts">
  import { Button, Dialog } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  let { state }: { state: ReconciliationState } = $props();
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
      <div>
        <label for="bank-file" class="block text-sm font-medium mb-1">Fichier de relevé bancaire</label>
        <input
          id="bank-file"
          type="file"
          accept=".ofx,.csv"
          required
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label for="bank-account" class="block text-sm font-medium mb-1">Compte bancaire cible</label>
        <select
          id="bank-account"
          bind:value={state.selectedAccount}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="auto">Détection automatique depuis le fichier</option>
          <option value="current">Compte Courant (Société Générale)</option>
          <option value="savings">Compte Livret</option>
          <option value="cash">Caisse Physique</option>
        </select>
      </div>

      {#if state.errorMsg}
        <div class="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {state.errorMsg}
        </div>
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
