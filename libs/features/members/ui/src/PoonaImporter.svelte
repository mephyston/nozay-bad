<script lang="ts">
  import { Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-svelte';

  interface ImportResult {
    success: boolean;
    inserted: number;
    updated: number;
    errors: number;
  }

  let { result = null, error = null }: { result: ImportResult | null; error: string | null } = $props();

  let dragOver = $state(false);
  let selectedFile = $state<File | null>(null);
  let loading = $state(false);
  let formElement = $state<HTMLFormElement | null>(null);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    }
  }

  function handleSubmit(e: Event) {
    if (!selectedFile) {
      e.preventDefault();
      return;
    }
    loading = true;
  }
</script>

<div class="max-w-xl mx-auto bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
  {#if error}
    <div class="mb-6 p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg flex items-start gap-3">
      <AlertCircle class="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <h4 class="font-semibold">Erreur d'importation</h4>
        <p class="text-sm mt-1">{error}</p>
      </div>
    </div>
  {/if}

  {#if result}
    <div class="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start gap-3">
      <CheckCircle class="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <h4 class="font-semibold text-emerald-800 dark:text-emerald-300">Importation réussie</h4>
        <div class="grid grid-cols-3 gap-6 mt-3">
          <div class="text-center p-3 bg-background border border-border rounded-md">
            <div class="text-2xl font-bold">{result.inserted}</div>
            <div class="text-xs text-muted-foreground mt-1">Créations</div>
          </div>
          <div class="text-center p-3 bg-background border border-border rounded-md">
            <div class="text-2xl font-bold">{result.updated}</div>
            <div class="text-xs text-muted-foreground mt-1">Mises à jour</div>
          </div>
          <div class="text-center p-3 bg-background border border-border rounded-md">
            <div class="text-2xl font-bold text-destructive">{result.errors}</div>
            <div class="text-xs text-muted-foreground mt-1">Rejets</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <form method="POST" enctype="multipart/form-data" onsubmit={handleSubmit} bind:this={formElement}>
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer
      {dragOver ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/10'}"
      ondragenter={handleDragOver}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => formElement?.querySelector('input')?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && formElement?.querySelector('input')?.click()}
    >
      <input
        type="file"
        name="file"
        accept=".csv"
        class="hidden"
        onchange={handleFileChange}
      />

      <Upload class="w-10 h-10 text-muted-foreground mb-4" />

      {#if selectedFile}
        <p class="font-semibold text-sm">{selectedFile.name}</p>
        <p class="text-xs text-muted-foreground mt-1">
          {(selectedFile.size / 1024).toFixed(1)} KB
        </p>
      {:else}
        <p class="font-semibold text-sm">Sélectionnez un fichier CSV ou Glissez et déposez</p>
        <p class="text-xs text-muted-foreground mt-1">
          Fichier d'extraction Poona (.csv uniquement)
        </p>
      {/if}
    </div>

    <div class="mt-6 flex justify-end gap-3">
      {#if selectedFile}
        <button
          type="button"
          class="px-4 py-2 border border-border bg-background hover:bg-muted text-foreground text-sm font-medium rounded-md"
          onclick={() => { selectedFile = null; }}
          disabled={loading}
        >
          Annuler
        </button>
      {/if}

      <button
        type="submit"
        class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md shadow-sm flex items-center justify-center gap-2"
        disabled={!selectedFile || loading}
      >
        {#if loading}
          <RefreshCw class="w-4 h-4 animate-spin" />
          Importation en cours...
        {:else}
          Lancer l'importation
        {/if}
      </button>
    </div>
  </form>
</div>
