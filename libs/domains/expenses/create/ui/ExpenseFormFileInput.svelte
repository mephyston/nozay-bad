<script lang="ts">
  import { UploadCloud, Loader2 } from '@lucide/svelte';
  import { compresserJustificatif, poidsDataUrl } from './receipt-compression';

  /**
   * Choix du justificatif, avec compression dans le navigateur.
   *
   * La photo part en base64 dans D1 : une photo de téléphone dépasse la limite sans
   * effort, et l'ancien contrôle se contentait de la refuser — à l'adhérent de se
   * débrouiller avec un outil de retouche. On réduit désormais avant d'envoyer, et on ne
   * refuse que si même la compression n'y suffit pas.
   */
  let {
    photoUrl = $bindable(null),
    fileInput = $bindable(null),
    onError
  }: {
    photoUrl: string | null;
    fileInput: HTMLInputElement | null;
    onError: (msg: string) => void;
  } = $props();

  let compression = $state(false);
  let allege = $state<{ avant: number; apres: number } | null>(null);

  const enKo = (octets: number) => `${Math.round(octets / 1024)} Ko`;

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    compression = true;
    allege = null;
    try {
      const { dataUrl, octets, octetsOrigine } = await compresserJustificatif(file);
      photoUrl = dataUrl;
      // Affiché seulement quand la compression a réellement servi : sur un petit reçu,
      // annoncer « 40 Ko → 38 Ko » n'apprend rien.
      if (octetsOrigine > octets * 1.2) allege = { avant: octetsOrigine, apres: octets };
    } catch (erreur) {
      onError(erreur instanceof Error ? erreur.message : 'Justificatif illisible.');
      target.value = '';
    } finally {
      compression = false;
    }
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
    
    {#if compression}
      <div class="flex flex-col items-center justify-center py-6 text-center">
        <Loader2 class="text-muted-foreground mb-2 h-8 w-8 animate-spin" />
        <span class="text-sm font-semibold text-foreground">Allègement de la photo…</span>
      </div>
    {:else if photoUrl}
      <div class="flex flex-col items-center space-y-2 py-2">
        <img src={photoUrl} alt="Aperçu du justificatif" class="max-h-40 rounded-lg shadow-md border border-border object-contain" />
        <span class="text-xs text-muted-foreground font-semibold">
          Justificatif chargé{#if allege} · {enKo(allege.avant)} → {enKo(allege.apres)}{:else} · {enKo(poidsDataUrl(photoUrl))}{/if}
        </span>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-4 text-center">
        <UploadCloud class="w-10 h-10 text-muted-foreground mb-2" />
        <span class="text-sm font-semibold text-foreground">Cliquez ou glissez-déposez la photo</span>
        <span class="text-xs text-muted-foreground mt-1">Photo ou capture — elle est allégée automatiquement</span>
      </div>
    {/if}
  </div>
</div>
