<script lang="ts">
  import { Image as ImageIcon, X } from '@lucide/svelte';
  import { Button, Card } from '@nba/ui';

  let {
    selectedPhoto = $bindable(null)
  }: {
    selectedPhoto: string | null;
  } = $props();
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
        <img src={selectedPhoto} alt="Justificatif de dépense" class="max-w-full max-h-[50vh] rounded-lg shadow-md object-contain border border-border" />
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
