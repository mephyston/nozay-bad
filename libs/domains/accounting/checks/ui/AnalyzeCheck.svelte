<script lang="ts">
  import { Camera, Loader2 } from 'lucide-svelte';
  import { Button } from '@metacult/shared-ui';

  let {
    isAnalyzing = false,
    fileInput = $bindable(),
    onFileSelected
  }: {
    isAnalyzing: boolean;
    fileInput: HTMLInputElement | undefined;
    onFileSelected: (e: Event) => void;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 bg-gray-50 text-center space-y-4">
  <input
    type="file"
    accept="image/*"
    capture="environment"
    class="hidden"
    bind:this={fileInput}
    onchange={onFileSelected}
  />
  <div class="p-3 bg-blue-100 text-blue-600 rounded-full">
    {#if isAnalyzing}
      <Loader2 class="w-8 h-8 animate-spin" />
    {:else}
      <Camera class="w-8 h-8" />
    {/if}
  </div>
  <div>
    <h3 class="text-sm font-semibold text-gray-800">Scanner un chèque</h3>
    <p class="text-xs text-gray-500 mt-1">Prenez une photo claire pour extraire les informations automatiquement (IA)</p>
  </div>
  <Button
    onclick={() => fileInput?.click()}
    disabled={isAnalyzing}
    variant="outline"
    size="sm"
  >
    {isAnalyzing ? 'Analyse en cours...' : 'Prendre une photo'}
  </Button>
</div>
