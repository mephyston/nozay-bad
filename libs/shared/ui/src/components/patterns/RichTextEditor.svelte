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
    onPickFile
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
  } = $props();

  let editor = $state<HTMLDivElement | null>(null);
  let activeCommands = $state<string[]>([]);
  let linkOpen = $state(false);
  let linkUrl = $state('');
  let savedRange: Range | null = null;

  const TRACKED = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];

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

  async function insertFileLink(): Promise<void> {
    if (!onPickFile || disabled) return;
    // La sélection est mémorisée *avant* l'ouverture du sélecteur : le temps de choisir,
    // le focus a quitté la zone d'édition et le curseur serait perdu.
    saveSelection();
    const picked = await onPickFile();
    if (!picked) {
      savedRange = null;
      return;
    }
    editor?.focus();
    restoreSelection();
    // `insertHTML` plutôt que `createLink` : il n'y a pas de sélection à envelopper,
    // c'est le libellé du fichier qui devient le texte du lien.
    document.execCommand('insertHTML', false, `<a href="${picked.href}">${picked.label}</a>&nbsp;`);
    syncFromEditor();
    savedRange = null;
  }

  function handleCommand(command: string): void {
    if (command === 'insertFile') {
      void insertFileLink();
      return;
    }
    if (command === 'createLink') {
      saveSelection();
      linkUrl = '';
      linkOpen = true;
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

  function refreshActiveCommands(): void {
    if (!editor || typeof document.queryCommandState !== 'function') return;
    activeCommands = TRACKED.filter((command) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    });
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
  <RichTextToolbar {activeCommands} {disabled} onCommand={handleCommand} canInsertFile={Boolean(onPickFile)} />

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
  .nba-rich-text :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }
</style>
