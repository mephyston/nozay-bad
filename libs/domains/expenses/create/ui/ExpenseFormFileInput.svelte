<script lang="ts">
  import { UploadCloud } from '@lucide/svelte';

  let {
    photoUrl = $bindable(null),
    fileInput = $bindable(null),
    onError
  }: {
    photoUrl: string | null;
    fileInput: HTMLInputElement | null;
    onError: (msg: string) => void;
  } = $props();

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      onError("Le fichier est trop volumineux (max 800 Ko pour le stockage D1).");
      target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      photoUrl = reader.result as string;
    };
    reader.onerror = () => {
      onError("Erreur lors de la lecture du justificatif.");
    };
    reader.readAsDataURL(file);
  }
</script>

<div class="space-y-1.5">
  <span class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Justificatif (reçu, facture...)</span>
  
  <div class="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 bg-muted/10 cursor-pointer relative">
    <input
      type="file"
      id="receipt"
      accept="image/*"
      bind:this={fileInput}
      onchange={handleFileChange}
      class="absolute inset-0 opacity-0 cursor-pointer z-10"
    />
    
    {#if photoUrl}
      <div class="flex flex-col items-center space-y-2 py-2">
        <img src={photoUrl} alt="Aperçu du justificatif" class="max-h-40 rounded-lg shadow-md border border-border object-contain" />
        <span class="text-xs text-muted-foreground font-semibold">Justificatif chargé</span>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-4 text-center">
        <UploadCloud class="w-10 h-10 text-muted-foreground mb-2" />
        <span class="text-sm font-semibold text-foreground">Cliquez ou glissez-déposez la photo</span>
        <span class="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 800 Ko</span>
      </div>
    {/if}
  </div>
</div>
