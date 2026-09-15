<script lang="ts">
  import { FileText, Upload } from '@lucide/svelte';
  import { Button, Dialog, FormField, Alert, SearchableCombobox } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state` et Svelte lirait
     `$state(false)` comme l'auto-abonnement d'un store. */
  let { state: reconState = $bindable() }: { state: ReconciliationState } = $props();

  /*
    Une zone de dépôt, et non un `<input type="file">` nu.

    Le champ natif offrait un bouton de la largeur de son libellé pour une action qui consiste à
    faire glisser un fichier depuis le gestionnaire de fichiers. Le motif est celui de l'import
    Poona (`PoonaImporter`) : même surface, même repli au clic, même retour visuel au survol.
  */
  let fileInput = $state<HTMLInputElement | null>(null);
  let dragOver = $state(false);
  let selectedFile = $state<File | null>(null);

  const ACCEPTED = ['.ofx', '.csv'];

  function accepts(name: string) {
    return ACCEPTED.some((ext) => name.toLowerCase().endsWith(ext));
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!accepts(file.name)) {
      reconState.errorMsg = `« ${file.name} » n'est ni un .ofx ni un .csv.`;
      return;
    }
    /* Le formulaire lit `input.files` à la soumission : le fichier déposé doit y être posé. */
    if (fileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    }
    reconState.errorMsg = '';
    selectedFile = file;
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !accepts(file.name)) {
      reconState.errorMsg = `« ${file.name} » n'est ni un .ofx ni un .csv.`;
      input.value = '';
      selectedFile = null;
      return;
    }
    reconState.errorMsg = '';
    selectedFile = file;
  }
</script>

<Dialog.Root bind:open={reconState.showImportModal}>
  <Dialog.Content class="max-w-lg p-6 bg-card border-border shadow-xl">
    <Dialog.Header>
      <Dialog.Title class="text-xl font-bold">Importer un relevé bancaire</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground mt-1">
        Déposez votre fichier d'export bancaire (OFX ou CSV) pour charger les opérations du relevé.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={reconState.handleImport} class="space-y-4 mt-4">
      <!--
        Un `<label>` du champ, et non un `<div role="button">` qui appelle `input.click()`.

        Le clic programmatique sur un champ fichier en `display: none` est refusé sans un mot par
        certains navigateurs — la zone ne répondait plus qu'au glisser-déposer. Le label ouvre le
        sélecteur par le mécanisme natif, et le champ, rendu en `sr-only` plutôt que caché, reste
        atteignable au clavier : Entrée ou Espace dessus ouvrent le sélecteur, sans JavaScript.
      -->
      <label
        for="bank-file"
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[180px] cursor-pointer
        focus-within:ring-2 focus-within:ring-ring
        {dragOver ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/10'}"
        ondragenter={(e) => { e.preventDefault(); dragOver = true; }}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => { dragOver = false; }}
        ondrop={handleDrop}
      >
        <input
          bind:this={fileInput}
          id="bank-file"
          type="file"
          name="file"
          accept=".ofx,.csv"
          required
          class="sr-only"
          onchange={handleFileChange}
        />

        {#if selectedFile}
          <FileText class="w-10 h-10 text-primary mb-3" />
          <p class="font-semibold text-sm">{selectedFile.name}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {(selectedFile.size / 1024).toFixed(1)} Ko — cliquez pour en choisir un autre
          </p>
        {:else}
          <Upload class="w-10 h-10 text-muted-foreground mb-3" />
          <p class="font-semibold text-sm">Glissez le relevé ici, ou cliquez pour le choisir</p>
          <p class="text-xs text-muted-foreground mt-1">Export bancaire au format .ofx ou .csv</p>
        {/if}
      </label>

      <FormField id="bank-account" label="Compte bancaire cible">
        <SearchableCombobox
          id="bank-account"
          items={reconState.bankAccountItems}
          bind:value={reconState.selectedAccount}
        />
      </FormField>

      {#if reconState.errorMsg}
        <Alert.Root variant="destructive">
          <Alert.Description>{reconState.errorMsg}</Alert.Description>
        </Alert.Root>
      {/if}

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onclick={() => (reconState.showImportModal = false)}>
          Annuler
        </Button>
        <Button type="submit" disabled={!selectedFile || reconState.isSubmitting}>
          {reconState.isSubmitting ? 'Importation en cours...' : "Lancer l'importation"}
        </Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
