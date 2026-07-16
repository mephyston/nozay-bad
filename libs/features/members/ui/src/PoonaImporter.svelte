<script lang="ts">
  import { Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-svelte';
  import { Button, Card, Input, Alert } from '@metacult/shared-ui';

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

<Card.Root class="max-w-xl mx-auto">
  <Card.Content class="p-6">
    {#if error}
      <Alert.Root variant="destructive" class="mb-6">
        <AlertCircle class="w-4 h-4" />
        <Alert.Title>Erreur d'importation</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if result}
      <Alert.Root class="mb-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
        <CheckCircle class="w-4 h-4" />
        <Alert.Title class="text-emerald-600 dark:text-emerald-400">Importation réussie</Alert.Title>
        <Alert.Description class="text-emerald-600 dark:text-emerald-400">
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
        </Alert.Description>
      </Alert.Root>
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
        <Input
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
          <Button
            type="button"
            variant="outline"
            onclick={() => { selectedFile = null; }}
            disabled={loading}
          >
            Annuler
          </Button>
        {/if}

        <Button
          type="submit"
          disabled={!selectedFile || loading}
          class="flex items-center justify-center gap-2"
        >
          {#if loading}
            <RefreshCw class="w-4 h-4 animate-spin" />
            Importation en cours...
          {:else}
            Lancer l'importation
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
