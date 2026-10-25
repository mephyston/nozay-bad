<script lang="ts">
  import { Image as ImageIcon, X, FileText, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from '@lucide/svelte';
  import { Button, Dialog, openDocument } from '@nba/ui';
  import { estTypePdf, justificatifEnBlob } from '../../shared/justificatif';
  import type { SelectionDePieces } from './expenses-types';
  import { lirePiece } from './expenses-api';

  /**
   * Les justificatifs d'une note, un à la fois.
   *
   * La liste ne transporte plus leur contenu : une pièce déjà jointe est lue ici, à
   * l'ouverture, et gardée le temps de la visite pour qu'aller et revenir ne relise
   * rien. Une pièce tout juste choisie (feuille de modification) a déjà son contenu.
   *
   * Un `Dialog` et non un calque `fixed` posé dans la page : ouverte depuis la feuille
   * de modification, la visionneuse passait **derrière** elle au téléphone — la feuille
   * est téléportée en fin de document et garde le focus. Le dialogue est téléporté
   * après elle, et bits-ui empile les deux.
   */
  let {
    selection = $bindable(null)
  }: {
    selection: SelectionDePieces | null;
  } = $props();

  const lues = new Map<number, string>();
  let contenu = $state<string | null>(null);
  let erreur = $state<string | null>(null);

  const piece = $derived(selection ? selection.pieces[selection.index] : null);
  const total = $derived(selection?.pieces.length ?? 0);

  $effect(() => {
    const courante = piece;
    const note = selection?.expenseId;
    contenu = null;
    erreur = null;
    if (!courante || note === undefined) return;
    if (courante.dataUrl) {
      contenu = courante.dataUrl;
      return;
    }
    const id = courante.id!;
    const deja = lues.get(id);
    if (deja) {
      contenu = deja;
      return;
    }
    let abandon = false;
    lirePiece(note, id)
      .then((dataUrl) => {
        lues.set(id, dataUrl);
        if (!abandon) contenu = dataUrl;
      })
      .catch((e) => {
        if (!abandon) erreur = e instanceof Error ? e.message : 'Justificatif illisible.';
      });
    return () => {
      abandon = true;
    };
  });

  /*
    Un PDF ne s'affiche pas ici : la CSP de l'admin interdit de le cadrer. On l'ouvre
    dans le lecteur du navigateur, depuis une adresse `blob:` libérée au changement.
  */
  let adressePdf = $derived(
    contenu && piece && estTypePdf(piece.mediaType) ? URL.createObjectURL(justificatifEnBlob(contenu)) : null
  );
  $effect(() => {
    const adresse = adressePdf;
    return () => {
      if (adresse) URL.revokeObjectURL(adresse);
    };
  });

  function aller(pas: number) {
    if (!selection) return;
    selection = { ...selection, index: (selection.index + pas + total) % total };
  }

  function fermer() {
    selection = null;
    lues.clear();
  }
</script>

<Dialog.Root open={!!(selection && piece)} onOpenChange={(ouvert) => { if (!ouvert) fermer(); }}>
  <Dialog.Content
    showCloseButton={false}
    class="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
  >
    {#if selection && piece}
      <div class="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
        <Dialog.Title class="flex items-center gap-2 text-base font-bold text-foreground">
          <ImageIcon class="h-5 w-5 text-primary" />
          Justificatif{#if total > 1}&nbsp;{selection.index + 1}/{total}{/if}
        </Dialog.Title>
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={fermer}
          aria-label="Fermer"
          class="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X class="h-5 w-5" />
        </Button>
      </div>
      <div class="flex flex-1 items-center justify-center overflow-y-auto bg-muted/10 p-6">
        {#if erreur}
          <span class="text-sm font-semibold text-destructive">{erreur}</span>
        {:else if !contenu}
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        {:else if adressePdf}
          <div class="flex flex-col items-center gap-3 py-6 text-center">
            <FileText class="h-14 w-14 text-primary" />
            <span class="text-sm font-semibold text-foreground">Justificatif au format PDF</span>
            <Button onclick={() => openDocument(adressePdf!)} class="gap-2">
              <ExternalLink class="h-4 w-4" />
              Ouvrir le PDF
            </Button>
          </div>
        {:else}
          <img src={contenu} alt="Justificatif de dépense" class="max-h-[50vh] max-w-full rounded-lg border border-border object-contain shadow-md" />
        {/if}
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
        {#if total > 1}
          <div class="flex gap-2">
            <Button variant="outline" size="icon-sm" onclick={() => aller(-1)} aria-label="Pièce précédente">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onclick={() => aller(1)} aria-label="Pièce suivante">
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        {:else}
          <span></span>
        {/if}
        <Button variant="outline" onclick={fermer}>Fermer</Button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
