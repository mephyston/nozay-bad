<script lang="ts">
  import { onMount } from 'svelte';
  import RichTextToolbar from './RichTextToolbar.svelte';
  import { Button } from '../ui/button';
  import { Input } from '../ui/input';

  let {
    value = $bindable(''),
    id,
    placeholder = '',
    disabled = false,
    class: className = '',
    onPickFile,
    onPickImage
  }: {
    /** HTML restreint. L'assainissement d'autorité reste côté serveur. */
    value?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    /**
     * Choix d'un fichier à insérer en lien de téléchargement.
     *
     * Fournie par l'écran appelant, jamais par l'éditeur : c'est ce qui permet à ce
     * composant partagé d'ignorer la médiathèque, qui appartient au domaine du site.
     * Renvoie `null` si l'utilisateur renonce. Le bouton n'apparaît qu'avec elle.
     */
    onPickFile?: () => Promise<{ href: string; label: string } | null>;
    /**
     * Choix d'une image à insérer au curseur.
     *
     * Même contrat que `onPickFile` : l'éditeur réclame, l'écran appelant fournit. Le
     * `src` doit désigner un média du site — le serveur n'accepte que les chemins
     * `/media/`, et retirerait purement et simplement une image distante.
     */
    onPickImage?: () => Promise<{ src: string; alt: string; width?: number | null; height?: number | null } | null>;
  } = $props();

  let editor = $state<HTMLDivElement | null>(null);
  let activeCommands = $state<string[]>([]);
  let linkOpen = $state(false);
  let linkUrl = $state('');
  let savedRange: Range | null = null;

  const TRACKED = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];

  /**
   * Titres intermédiaires proposés, du plus fort au plus faible.
   *
   * Pas de `h1` : c'est le titre de la page, unique et posé par le gabarit. Le profil
   * d'assainissement le dit d'ailleurs à sa façon, en repliant tout `h1` reçu sur un
   * `h2`. La hiérarchie utile à l'auteur commence donc à `h2`.
   */
  const HEADINGS: Record<string, string> = { heading2: 'h2', heading3: 'h3' };

  /**
   * Zone d'édition pilotée par `document.execCommand`.
   *
   * L'API est officiellement dépréciée, mais reste le seul chemin universellement
   * supporté pour un éditeur de ce format sans embarquer de dépendance : les
   * alternatives (ProseMirror, Tiptap) pèsent plus lourd que tout le reste de l'écran,
   * pour six boutons de mise en forme.
   */
  function exec(command: string, argument?: string): void {
    if (disabled) return;
    editor?.focus();
    if (savedRange) restoreSelection();
    document.execCommand(command, false, argument);
    syncFromEditor();
    refreshActiveCommands();
  }

  /**
   * Échappe une valeur destinée à un attribut ou à du texte inséré.
   *
   * Le serveur assainit de toute façon, mais une apostrophe dans un nom de fichier
   * suffirait à refermer l'attribut et à produire un balisage cassé que l'auteur verrait
   * à l'écran. On échappe donc à la source.
   */
  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Insère du balisage au curseur, après avoir laissé l'utilisateur choisir.
   *
   * La sélection est mémorisée *avant* l'ouverture du sélecteur : le temps de choisir,
   * le focus a quitté la zone d'édition et le curseur serait perdu.
   */
  async function insertAtCursor<T>(pick: () => Promise<T | null>, toHtml: (picked: T) => string) {
    if (disabled) return;
    saveSelection();
    const picked = await pick();
    if (!picked) {
      savedRange = null;
      return;
    }
    editor?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, toHtml(picked));
    syncFromEditor();
    savedRange = null;
  }

  function handleCommand(command: string): void {
    if (command === 'insertFile' && onPickFile) {
      // `insertHTML` plutôt que `createLink` : il n'y a pas de sélection à envelopper,
      // c'est le libellé du fichier qui devient le texte du lien.
      void insertAtCursor(onPickFile, (f) => `<a href="${escapeHtml(f.href)}">${escapeHtml(f.label)}</a>&nbsp;`);
      return;
    }
    if (command === 'insertImage' && onPickImage) {
      // `width` et `height` sont posés quand la médiathèque les connaît : ce sont eux
      // qui réservent la place et suppriment le décalage de mise en page au chargement.
      void insertAtCursor(onPickImage, (image) => {
        const size = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : '';
        return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"${size}>`;
      });
      return;
    }
    if (command === 'createLink') {
      saveSelection();
      linkUrl = '';
      linkOpen = true;
      return;
    }
    if (HEADINGS[command]) {
      toggleHeading(command);
      return;
    }
    exec(command);
  }

  function saveSelection(): void {
    const selection = window.getSelection();
    savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  }

  function restoreSelection(): void {
    if (!savedRange) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
  }

  function applyLink(): void {
    const url = linkUrl.trim();
    // Contrôle de confort : le serveur reste l'autorité et retirera tout lien non conforme.
    const acceptable = /^(https?:\/\/|mailto:|\/)/i.test(url);
    if (!acceptable) return;
    linkOpen = false;
    exec('createLink', url);
    savedRange = null;
  }

  function cancelLink(): void {
    linkOpen = false;
    savedRange = null;
  }

  function syncFromEditor(): void {
    if (editor) value = editor.innerHTML;
  }

  /**
   * Balise du bloc sous le curseur.
   *
   * `formatBlock` ne se suit pas avec `queryCommandState`, qui ne connaît que les
   * commandes à deux états : c'est `queryCommandValue` qui rend le nom de la balise.
   * D'où un suivi distinct de celui des commandes de caractère.
   */
  function currentBlockTag(): string {
    try {
      return (document.queryCommandValue('formatBlock') || '').toLowerCase();
    } catch {
      return '';
    }
  }

  function toggleHeading(command: string): void {
    const tag = HEADINGS[command];
    // Recliquer sur le niveau déjà posé ramène au paragraphe : sans cela, un titre mis
    // par mégarde ne pourrait plus être défait autrement qu'en retapant la ligne.
    exec('formatBlock', currentBlockTag() === tag ? '<p>' : `<${tag}>`);
  }

  function refreshActiveCommands(): void {
    if (!editor || typeof document.queryCommandState !== 'function') return;
    const active = TRACKED.filter((command) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    });

    const tag = currentBlockTag();
    for (const [command, heading] of Object.entries(HEADINGS)) {
      if (tag === heading) active.push(command);
    }
    activeCommands = active;
  }

  /**
   * Collage en texte brut.
   *
   * Coller depuis un traitement de texte injecterait des `<span style>`, des polices et
   * parfois des images encodées : tout serait retiré par le serveur, laissant l'auteur
   * devant un résultat qu'il n'a pas voulu. Autant ne rien accepter d'autre que le texte.
   */
  function handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    syncFromEditor();
  }

  onMount(() => {
    /*
      Entrée crée un `<p>`, et non le `<div>` que produisent Chrome et Safari par
      défaut. L'assainisseur replie déjà `div` sur `p`, donc l'enregistré ne changeait
      pas ; mais dans la zone d'édition ces `<div>` échappaient aux marges de
      paragraphe, et le texte apparaissait tassé après un titre.
    */
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      /* Commande inconnue du navigateur : le repli côté serveur suffit. */
    }

    const onSelectionChange = () => {
      if (document.activeElement === editor) refreshActiveCommands();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  });

  // Synchronisation entrante : réinitialisation du formulaire, ou ouverture en édition.
  // La garde d'égalité évite de replacer le curseur au début à chaque frappe.
  $effect(() => {
    if (editor && value !== editor.innerHTML) editor.innerHTML = value ?? '';
  });

  const isEmpty = $derived(!value || value === '<br>' || value === '<p></p>');
</script>

<div class={`rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring ${className}`}>
  <RichTextToolbar {activeCommands} {disabled} onCommand={handleCommand} canInsertFile={Boolean(onPickFile)} canInsertImage={Boolean(onPickImage)} />

  {#if linkOpen}
    <div class="flex items-center gap-2 border-b border-input px-2 py-2">
      <Input
        bind:value={linkUrl}
        placeholder="https://exemple.fr ou /boutique"
        aria-label="Adresse du lien"
        class="h-9"
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyLink();
          }
          if (e.key === 'Escape') cancelLink();
        }}
      />
      <Button type="button" size="sm" onclick={applyLink}>Ajouter</Button>
      <Button type="button" size="sm" variant="ghost" onclick={cancelLink}>Annuler</Button>
    </div>
  {/if}

  <div class="relative">
    {#if isEmpty && placeholder}
      <span class="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">{placeholder}</span>
    {/if}
    <div
      bind:this={editor}
      {id}
      role="textbox"
      aria-multiline="true"
      aria-label="Texte de l'annonce"
      tabindex="0"
      contenteditable={!disabled}
      class="nba-rich-text min-h-[10rem] w-full px-3 py-2 text-sm outline-none disabled:opacity-50"
      oninput={syncFromEditor}
      onblur={syncFromEditor}
      onpaste={handlePaste}
      onkeyup={refreshActiveCommands}
      onmouseup={refreshActiveCommands}
    ></div>
  </div>
</div>

<style>
  /* Le contenu est injecté via contenteditable : `:global` est nécessaire pour l'atteindre. */
  .nba-rich-text :global(p) {
    margin: 0 0 0.5rem;
  }
  .nba-rich-text :global(p:last-child) {
    margin-bottom: 0;
  }
  .nba-rich-text :global(ul),
  .nba-rich-text :global(ol) {
    margin: 0 0 0.5rem;
    padding-left: 1.5rem;
  }
  .nba-rich-text :global(ul) {
    list-style: disc;
  }
  .nba-rich-text :global(ol) {
    list-style: decimal;
  }
  /*
    Les titres se voient dans la zone d'édition, sinon l'auteur ne distingue pas ce
    qu'il vient de poser. Les tailles suivent celles du site public, à l'échelle près.
  */
  .nba-rich-text :global(h2),
  .nba-rich-text :global(h3) {
    margin: 0.75rem 0 0.375rem;
    font-weight: 600;
    line-height: 1.25;
  }
  .nba-rich-text :global(h2:first-child),
  .nba-rich-text :global(h3:first-child) {
    margin-top: 0;
  }
  .nba-rich-text :global(h2) {
    font-size: 1.25rem;
  }
  .nba-rich-text :global(h3) {
    font-size: 1.0625rem;
  }
  .nba-rich-text :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }
</style>
