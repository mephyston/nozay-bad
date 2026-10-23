<script lang="ts">
  import { Image as ImageIcon, X, FileText, ExternalLink } from '@lucide/svelte';
  import { Button, Card, openDocument } from '@nba/ui';
  import { estJustificatifPdf, justificatifEnBlob } from '../../shared/justificatif';

  let {
    selectedPhoto = $bindable(null)
  }: {
    selectedPhoto: string | null;
  } = $props();

  /*
    Un PDF ne s'affiche pas ici : la CSP de l'admin interdit de le cadrer. On l'ouvre
    dans le lecteur du navigateur, depuis une adresse `blob:` libérée à la fermeture.
  */
  let adressePdf = $derived(
    selectedPhoto && estJustificatifPdf(selectedPhoto) ? URL.createObjectURL(justificatifEnBlob(selectedPhoto)) : null
  );
  $effect(() => {
    const adresse = adressePdf;
    return () => {
      if (adresse) URL.revokeObjectURL(adresse);
    };
  });
</script>

{#if selectedPhoto}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card.Root class="max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border rounded-2xl p-0">
      <Card.Header class="border-b px-5 py-4 flex flex-row justify-between items-center bg-muted/20 space-y-0">
        <Card.Title class="font-bold text-foreground flex items-center gap-2 text-base">
          <ImageIcon class="w-5 h-5 text-primary" />
          Justificatif de la dépense
        </Card.Title>
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={() => selectedPhoto = null}
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X class="w-5 h-5" />
        </Button>
      </Card.Header>
      <Card.Content class="p-6 overflow-y-auto flex items-center justify-center bg-muted/10 flex-1">
        {#if adressePdf}
          <div class="flex flex-col items-center gap-3 py-6 text-center">
            <FileText class="h-14 w-14 text-primary" />
            <span class="text-sm font-semibold text-foreground">Justificatif au format PDF</span>
            <Button onclick={() => openDocument(adressePdf!)} class="gap-2">
              <ExternalLink class="h-4 w-4" />
              Ouvrir le PDF
            </Button>
          </div>
        {:else}
          <img src={selectedPhoto} alt="Justificatif de dépense" class="max-w-full max-h-[50vh] rounded-lg shadow-md object-contain border border-border" />
        {/if}
      </Card.Content>
      <Card.Footer class="border-t border-border px-5 py-3.5 flex justify-end bg-muted/20">
        <Button
          variant="outline"
          onclick={() => selectedPhoto = null}
        >
          Fermer
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
{/if}
