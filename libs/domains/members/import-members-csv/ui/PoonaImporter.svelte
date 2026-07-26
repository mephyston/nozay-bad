<script module>
  export * from './poona-importer-types';
  export * from './poona-importer-parser';
</script>

<script lang="ts">
  import { Upload, AlertCircle, RefreshCw, FileText } from '@lucide/svelte';
  import { Button, Card, Alert } from '@nba/ui';
  import type { ImportResult } from './poona-importer-types';
  import { parseCsvContent } from './poona-importer-parser';
  import PoonaImporterResults from './PoonaImporterResults.svelte';
  import PoonaImporterPreview from './PoonaImporterPreview.svelte';

  let { result = null, error = null }: { result: ImportResult | null; error: string | null } = $props();

  let dragOver = $state(false);
  let selectedFile = $state<File | null>(null);
  let loading = $state(false);
  let formElement = $state<HTMLFormElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  let csvPreview = $state<any[]>([]);
  let totalRows = $state(0);
  let separator = $state(';');
  let localError = $state<string | null>(null);
  let isValidating = $state(false);

  function resetForm() {
    selectedFile = null;
    csvPreview = [];
    localError = null;
    totalRows = 0;
    isValidating = false;
    if (fileInput) fileInput.value = '';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (fileInput) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
        } catch (err) {
          console.error('Failed to set files using DataTransfer:', err);
        }
      }
      processFile(file);
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) processFile(input.files[0]);
  }

  function processFile(file: File) {
    isValidating = true;
    csvPreview = [];
    totalRows = 0;
    localError = null;

    if (!file.name.endsWith('.csv')) {
      resetForm();
      localError = "Le fichier doit être au format CSV (.csv uniquement).";
      isValidating = false;
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsvContent(text);
        if (parsed.error) {
          resetForm();
          localError = parsed.error;
          return;
        }
        separator = parsed.separator;
        totalRows = parsed.totalRows;
        csvPreview = parsed.csvPreview;
      } finally {
        isValidating = false;
      }
    };
    reader.onerror = () => { isValidating = false; localError = "Erreur de lecture du fichier."; };
    try { reader.readAsText(file); } catch (e) { isValidating = false; localError = "Impossible de lire le fichier."; }
  }

  function handleSubmit(e: Event) {
    if (!selectedFile || localError) e.preventDefault();
    else loading = true;
  }
</script>

<Card.Root class="max-w-xl mx-auto">
  <Card.Content class="p-6">
    {#if error}
      <Alert.Root variant="destructive" class="mb-6">
        <AlertCircle class="w-4 h-4" />
        <Alert.Title>Erreur d'importation</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if localError}
      <Alert.Root variant="destructive" class="mb-6">
        <AlertCircle class="w-4 h-4" />
        <Alert.Title>Erreur de format locale</Alert.Title>
        <Alert.Description>{localError}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if result}
      <PoonaImporterResults {result} />
    {/if}

    <form method="POST" enctype="multipart/form-data" onsubmit={handleSubmit} bind:this={formElement}>
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer
        {dragOver ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/10'}"
        ondragenter={(e) => { e.preventDefault(); dragOver = true; }}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => { dragOver = false; }}
        ondrop={handleDrop}
        onclick={() => fileInput?.click()}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); } }}
      >
        <input
          bind:this={fileInput}
          type="file"
          name="file"
          accept=".csv"
          class="hidden"
          onchange={handleFileChange}
          onclick={(e) => e.stopPropagation()}
        />

        <Upload class="w-10 h-10 text-muted-foreground mb-4" />

        {#if selectedFile}
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-primary" />
            <p class="font-semibold text-sm">{selectedFile.name}</p>
          </div>
          <p class="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — {totalRows} ligne(s) détectée(s)</p>
        {:else}
          <p class="font-semibold text-sm">Sélectionnez un fichier CSV ou Glissez et déposez</p>
          <p class="text-xs text-muted-foreground mt-1">Fichier d'extraction Poona (.csv uniquement)</p>
        {/if}
      </div>

      {#if selectedFile && csvPreview.length > 0 && !localError}
        <PoonaImporterPreview {csvPreview} {separator} />
      {/if}

      <div class="mt-6 flex justify-end gap-3">
        {#if selectedFile}
          <Button type="button" variant="outline" onclick={resetForm} disabled={loading}>
            Annuler
          </Button>
        {/if}

        <Button
          type="submit"
          disabled={!selectedFile || loading || isValidating || !!localError}
          class="flex items-center justify-center gap-2"
        >
          {#if loading}
            <RefreshCw class="w-4 h-4 animate-spin" /> Importation en cours...
          {:else}
            Lancer l'importation
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
