<script lang="ts">
  import { UploadCloud, Loader2, FileText, Image as ImageIcon, Plus, X } from '@lucide/svelte';
  import { compresserJustificatif } from './receipt-compression';
  import { PIECES_MAX, estTypePdf, typeDePiece, type PieceJointe } from '../../shared/justificatif';

  /**
   * Les pièces jointes d'une note, avec compression dans le navigateur.
   *
   * Chaque pièce part en base64 dans D1 : une photo de téléphone dépasse la limite sans
   * effort, et l'ancien contrôle se contentait de la refuser — à l'adhérent de se
   * débrouiller avec un outil de retouche. On réduit désormais avant d'envoyer, et on ne
   * refuse que si même la compression n'y suffit pas. Un PDF part tel quel.
   *
   * Cinq pièces au plus : un déplacement (péage, carburant, repas) tient dans une note
   * au lieu d'une note par ticket. Le sélecteur accepte plusieurs fichiers d'un coup.
   *
   * Une pièce déjà jointe (feuille de modification) n'a que son type : son contenu n'est
   * lu qu'à l'ouverture, par `onVoir`.
   */
  let {
    pieces = $bindable([]),
    onError,
    onVoir
  }: {
    pieces: PieceJointe[];
    onError: (msg: string) => void;
    onVoir?: (index: number) => void;
  } = $props();

  let compression = $state(false);

  const pleine = $derived(pieces.length >= PIECES_MAX);

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const fichiers = Array.from(target.files ?? []);
    // Vidé tout de suite : rechoisir le même fichier après l'avoir retiré doit redéclencher `change`.
    target.value = '';
    if (fichiers.length === 0) return;

    const place = PIECES_MAX - pieces.length;
    if (fichiers.length > place) {
      onError(`Une note porte ${PIECES_MAX} pièces au plus : ${fichiers.length - place} fichier(s) non ajouté(s).`);
    }

    compression = true;
    try {
      for (const file of fichiers.slice(0, place)) {
        try {
          const { dataUrl } = await compresserJustificatif(file);
          pieces = [...pieces, { dataUrl, mediaType: typeDePiece(dataUrl) ?? 'image/jpeg', nom: file.name }];
        } catch (erreur) {
          onError(erreur instanceof Error ? erreur.message : `« ${file.name} » est illisible.`);
        }
      }
    } finally {
      compression = false;
    }
  }

  function retirer(index: number) {
    pieces = pieces.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-1.5">
  <span class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
    Justificatifs (reçus, factures…){#if pieces.length > 0} · {pieces.length}/{PIECES_MAX}{/if}
  </span>

  {#if pieces.length > 0}
    <ul class="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Pièces jointes">
      <!-- Sans clé : le même fichier joint deux fois en donnerait deux identiques. -->
      {#each pieces as piece, i}
        <li class="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
          <button
            type="button"
            class="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center"
            disabled={!piece.dataUrl && !onVoir}
            onclick={() => onVoir?.(i)}
            aria-label={`Voir la pièce n° ${i + 1}`}
          >
            {#if piece.dataUrl && !estTypePdf(piece.mediaType)}
              <img src={piece.dataUrl} alt="" class="h-full w-full object-cover" />
            {:else}
              {#if estTypePdf(piece.mediaType)}
                <FileText class="h-7 w-7 text-primary" />
              {:else}
                <ImageIcon class="h-7 w-7 text-primary" />
              {/if}
              <span class="line-clamp-2 break-all text-[0.65rem] font-semibold text-muted-foreground">
                {piece.nom ?? (estTypePdf(piece.mediaType) ? `PDF n° ${i + 1}` : `Photo n° ${i + 1}`)}
              </span>
            {/if}
          </button>
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground shadow hover:text-destructive"
            onclick={() => retirer(i)}
            aria-label={`Retirer la pièce n° ${i + 1}`}
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if !pleine}
    <div class="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 p-4 transition-colors hover:border-primary/50">
      <input
        type="file"
        id="receipt"
        multiple
        accept="image/*,application/pdf,.pdf"
        onchange={handleFileChange}
        disabled={compression}
        class="absolute inset-0 z-10 cursor-pointer opacity-0"
      />

      {#if compression}
        <div class="flex flex-col items-center justify-center py-4 text-center">
          <Loader2 class="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
          <span class="text-sm font-semibold text-foreground">Préparation des justificatifs…</span>
        </div>
      {:else if pieces.length > 0}
        <span class="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Plus class="h-4 w-4" />
          Ajouter une pièce
        </span>
      {:else}
        <div class="flex flex-col items-center justify-center py-4 text-center">
          <UploadCloud class="mb-2 h-10 w-10 text-muted-foreground" />
          <span class="text-sm font-semibold text-foreground">Cliquez ou glissez-déposez photos ou PDF</span>
          <span class="mt-1 text-xs text-muted-foreground">Jusqu'à {PIECES_MAX} pièces — une photo est allégée automatiquement</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
