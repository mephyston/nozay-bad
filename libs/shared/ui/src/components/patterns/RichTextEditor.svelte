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
    onPickImage,
    mediaOrigin = '',
    linkSuggestions = []
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
    /**
     * Origine à préfixer aux images **le temps de l'affichage**.
     *
     * Les octets d'un média sont servis par le site public, et par lui seul. Une
     * administration sur un autre domaine ne répond donc rien sur `/media/…`, et une
     * image insérée restait invisible dans la zone d'édition — alors même qu'elle
     * s'affichait correctement une fois la page publiée.
     *
     * Le chemin relatif reste seul enregistré : c'est la forme qu'exige l'assainisseur,
     * et y graver un domaine coupleraient le contenu à l'environnement qui l'a produit.
     * D'où la règle tenue par les deux fonctions ci-dessous — **le DOM porte l'adresse
     * affichable, `value` porte le chemin enregistré** — et non un aller simple qui
     * laisserait l'origine s'écrire en base à la première frappe.
     */
    mediaOrigin?: string;
    /**
     * Adresses proposées à l'insertion d'un lien.
     *
     * Volontairement générique — `href`, `label`, et une mention libre — plutôt qu'une
     * liste de pages : ce composant appartient à `@nba/ui` et n'a pas à savoir ce
     * qu'est une page, un article ou un brouillon. L'écran appelant traduit son
     * domaine dans ce vocabulaire, et reste seul juge de ce qu'il propose.
     *
     * Vide, l'insertion de lien retombe sur la seule saisie d'adresse.
     */
    linkSuggestions?: { href: string; label: string; hint?: string }[];
  } = $props();

  /** Chemin enregistré → adresse affichable. */
  const toDisplay = (html: string): string =>
    mediaOrigin ? html.replaceAll('src="/media/', `src="${mediaOrigin}/media/`) : html;

  /** Adresse affichable → chemin enregistré. */
  const toStored = (html: string): string =>
    mediaOrigin ? html.replaceAll(`src="${mediaOrigin}/media/`, 'src="/media/') : html;

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
   * Centrage : une classe posée sur le bloc, jamais un `style`.
   *
   * `document.execCommand('justifyCenter')` écrit `style="text-align:center"`, que
   * l'assainisseur refuse — analyser du CSS pour n'en garder qu'une déclaration
   * coûterait plus cher que le bénéfice. Le profil du site accepte en revanche cette
   * classe unique, et les feuilles de l'éditeur comme du site la rendent.
   */
  const CENTER_CLASS = 'nba-center';
  const CENTERABLE = new Set(['p', 'h2', 'h3', 'h4', 'blockquote', 'figure']);

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
    // Inséré sous sa forme affichable : `syncFromEditor` le ramènera au chemin relatif.
    document.execCommand('insertHTML', false, toDisplay(toHtml(picked)));
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
      linkSearch = '';
      // Le site d'abord quand on a de quoi proposer : c'est la cible la plus fréquente,
      // et celle qu'on saisit le plus mal à la main.
      linkMode = linkSuggestions.length > 0 ? 'internal' : 'external';
      linkOpen = true;
      return;
    }
    if (command === 'alignCenter') {
      toggleCenter();
      return;
    }
    if (HEADINGS[command]) {
      toggleHeading(command);
      return;
    }
    exec(command);
  }

  /** Bloc portant le curseur, borné à la zone d'édition. */
  function currentBlock(): HTMLElement | null {
    let node: Node | null = window.getSelection()?.anchorNode ?? null;
    while (node && node !== editor) {
      if (node instanceof HTMLElement && CENTERABLE.has(node.tagName.toLowerCase())) return node;
      node = node.parentNode;
    }
    return null;
  }

  function toggleCenter(): void {
    if (disabled) return;
    editor?.focus();
    if (savedRange) restoreSelection();

    // Une première ligne tapée sans passer par Entrée reste un simple nœud de texte,
    // sans bloc à porter la classe : on lui en donne un plutôt que de ne rien faire.
    if (!currentBlock()) document.execCommand('formatBlock', false, '<p>');

    const block = currentBlock();
    if (!block) return;

    block.classList.toggle(CENTER_CLASS);
    // `class=""` traverserait l'assainisseur pour finir en attribut vide dans la page.
    if (block.className.trim() === '') block.removeAttribute('class');

    syncFromEditor();
    refreshActiveCommands();
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

  /**
   * Pose le lien sur la sélection — ou l'écrit en entier s'il n'y en a pas.
   *
   * `createLink` enveloppe une sélection : sans elle, il ne fait rien, et le clic
   * restait sans effet. Quand on choisit une page dans la liste, son titre fournit
   * précisément le texte qui manquait.
   */
  function applyLink(url: string, label?: string): void {
    const href = url.trim();
    // Contrôle de confort : le serveur reste l'autorité et retirera tout lien non conforme.
    if (!/^(https?:\/\/|mailto:|\/)/i.test(href)) return;
    linkOpen = false;

    const collapsed = savedRange?.collapsed ?? true;
    if (collapsed && label) {
      editor?.focus();
      restoreSelection();
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>&nbsp;`
      );
      syncFromEditor();
    } else {
      exec('createLink', href);
    }
    savedRange = null;
  }

  function cancelLink(): void {
    linkOpen = false;
    savedRange = null;
  }

  let linkMode = $state<'internal' | 'external'>('external');
  let linkSearch = $state('');

  const suggestions = $derived(
    linkSuggestions.filter((item) => {
      const term = linkSearch.trim().toLowerCase();
      if (!term) return true;
      return item.label.toLowerCase().includes(term) || item.href.toLowerCase().includes(term);
    })
  );

  function syncFromEditor(): void {
    if (editor) value = toStored(editor.innerHTML);
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
    if (currentBlock()?.classList.contains(CENTER_CLASS)) active.push('alignCenter');
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
  // La garde d'égalité évite de replacer le curseur au début à chaque frappe — elle
  // porte donc sur la forme **affichable**, la seule que le DOM contienne.
  $effect(() => {
    const html = toDisplay(value ?? '');
    if (editor && html !== editor.innerHTML) editor.innerHTML = html;
  });

  const isEmpty = $derived(!value || value === '<br>' || value === '<p></p>');
</script>

<div class={`rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring ${className}`}>
  <RichTextToolbar {activeCommands} {disabled} onCommand={handleCommand} canInsertFile={Boolean(onPickFile)} canInsertImage={Boolean(onPickImage)} />

  {#if linkOpen}
    <div class="space-y-2 border-b border-input px-2 py-2">
      {#if linkSuggestions.length > 0}
        <!-- Deux natures de lien, et non deux champs : on ne saisit pas une adresse
             interne à la main quand la liste des pages est là. -->
        <div class="flex gap-1" role="group" aria-label="Nature du lien">
          <Button
            type="button"
            size="sm"
            variant={linkMode === 'internal' ? 'secondary' : 'ghost'}
            aria-pressed={linkMode === 'internal'}
            onclick={() => (linkMode = 'internal')}
          >
            Une page du site
          </Button>
          <Button
            type="button"
            size="sm"
            variant={linkMode === 'external' ? 'secondary' : 'ghost'}
            aria-pressed={linkMode === 'external'}
            onclick={() => (linkMode = 'external')}
          >
            Une adresse extérieure
          </Button>
        </div>
      {/if}

      {#if linkMode === 'internal' && linkSuggestions.length > 0}
        <Input
          bind:value={linkSearch}
          placeholder="Rechercher une page…"
          aria-label="Rechercher une page"
          class="h-9"
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === 'Escape') cancelLink();
          }}
        />
        {#if suggestions.length === 0}
          <p class="text-muted-foreground px-1 py-2 text-sm">Aucune page ne correspond.</p>
        {:else}
          <ul class="max-h-56 overflow-y-auto">
            {#each suggestions as item (item.href)}
              <li>
                <button
                  type="button"
                  class="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  onclick={() => applyLink(item.href, item.label)}
                >
                  <span class="min-w-0 flex-1 truncate">{item.label}</span>
                  {#if item.hint}
                    <span class="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs">
                      {item.hint}
                    </span>
                  {/if}
                  <span class="text-muted-foreground hidden shrink-0 text-xs sm:inline">{item.href}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
        <div class="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onclick={cancelLink}>Annuler</Button>
        </div>
      {:else}
        <div class="flex items-center gap-2">
          <Input
            bind:value={linkUrl}
            placeholder="https://exemple.fr ou /boutique"
            aria-label="Adresse du lien"
            class="h-9"
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink(linkUrl);
              }
              if (e.key === 'Escape') cancelLink();
            }}
          />
          <Button type="button" size="sm" onclick={() => applyLink(linkUrl)}>Ajouter</Button>
          <Button type="button" size="sm" variant="ghost" onclick={cancelLink}>Annuler</Button>
        </div>
      {/if}
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
  /*
    Le centrage se voit dans la zone d'édition, comme les titres. Règle écrite à la
    main : la classe vit dans du HTML stocké, que Tailwind ne balaie pas — un
    utilitaire de même nom ne serait tout simplement pas généré.
  */
  .nba-rich-text :global(.nba-center) {
    text-align: center;
  }
</style>
