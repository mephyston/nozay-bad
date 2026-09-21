<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';
  import { IsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { dragDetents } from '../../lib/actions/drag-detents.js';
  import type { SheetSize } from '../ui/sheet/sheet-content.svelte';

  /**
   * Un panneau qui monte du bas sur téléphone, et reste latéral au-dessus.
   *
   * Un panneau latéral est un idiome de bureau : au pouce, ce qui s'ouvre monte du
   * bas, se glisse entre des paliers et se referme d'un geste vers le bas.
   *
   * Un seul `Dialog.Root`, un seul `open`, un seul rendu des enfants — c'est ce qui
   * distingue ce composant d'un `{#if mobile}<Drawer>{:else}<Sheet>{/if}` : celui-ci
   * remonterait le formulaire au franchissement du seuil, perdant la saisie en cours
   * à la rotation de l'écran, et dupliquerait le piège à focus.
   */
  let {
    open = $bindable(false),
    title,
    icon: Icon,
    description,
    detents = [0.5, 0.92],
    detent = $bindable(1),
    side = 'right',
    size = 'md',
    dismissible = true,
    showCloseButton = true,
    portalProps,
    class: className,
    header,
    children,
    footer
  }: {
    open?: boolean;
    title: string;
    icon?: any;
    description?: string;
    /** Paliers en fraction de la hauteur visible, croissants. Téléphone uniquement. */
    detents?: number[];
    /** Index du palier actif ; lisible et pilotable par l'appelant. */
    detent?: number;
    side?: 'left' | 'right';
    size?: SheetSize;
    dismissible?: boolean;
    showCloseButton?: boolean;
    /**
     * Destination du portail. Sert aux stories, dont la capture ne photographie que
     * `#storybook-root` : porté sur `document.body`, le contenu en sortirait.
     */
    portalProps?: { to?: string | HTMLElement };
    class?: string;
    header?: Snippet;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  /**
   * `MediaQuery` appelle `window.matchMedia` dès sa construction. Deux
   * environnements n'en ont pas : le rendu serveur, où `window` n'existe pas, et
   * jsdom, où il existe **sans** `matchMedia` — d'où la garde sur la fonction
   * elle-même et pas seulement sur `window`. Sans elle, tout écran portant un
   * formulaire tombe au rendu serveur.
   *
   * Dans ces deux cas on rend la présentation latérale ; l'hydratation corrige,
   * sans discordance visible puisque le contenu n'est rendu qu'une fois la
   * feuille ouverte, donc toujours après.
   */
  const requete =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? new IsMobile() : null;
  const estMobile = $derived(requete?.current ?? false);

  let contenu = $state<HTMLElement | null>(null);

  /**
   * Les paliers sont posés depuis un effet, faute de pouvoir écrire `use:` sur un
   * composant. L'action s'endort au-dessus du seuil et rend alors l'élément à sa
   * mise en page de panneau latéral.
   */
  $effect(() => {
    if (!contenu) return;
    const geste = dragDetents(contenu, {
      detents,
      detent,
      dismissible,
      enabled: estMobile,
      onDetent: (i) => (detent = i),
      onDismiss: () => (open = false),
    });
    return () => geste.destroy();
  });

  const TAILLE: Record<SheetSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Portal {...portalProps}>
    <Dialog.Overlay
      class="bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50"
      style="opacity: var(--nba-sheet-progress, 1)"
    />
    <!--
      `bind:ref` et non le snippet `child` : c'est `bits-ui` qui doit rester
      propriétaire de cet élément. Il pose `pointer-events: none` sur le `body`
      tant qu'un dialogue est ouvert et ne réactive que son propre contenu, par
      un `style` en ligne — qu'un attribut `style` à nous écrasait. Le formulaire
      s'affichait alors normalement mais ne réagissait plus à rien.
    -->
    <Dialog.Content
      bind:ref={contenu}
      data-presentation={estMobile ? 'sheet' : 'side'}
      class={cn(
        'bg-card text-card-foreground border-border fixed z-50 flex flex-col bg-clip-padding text-sm shadow-lg',
        estMobile
          ? // La montée est jouée par `dragDetents`, qui possède la translation ;
            // la sortie se contente d'un fondu, une animation de transformation
            // entrerait en conflit avec cette translation posée en ligne.
            'inset-x-0 bottom-0 rounded-t-2xl border-t data-closed:animate-out data-closed:fade-out-0 data-closed:duration-200'
          : cn(
              'inset-y-0 h-full w-full pt-[env(safe-area-inset-top,0px)]',
              'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
              side === 'right'
                ? 'right-0 border-l data-open:slide-in-from-right-10 data-closed:slide-out-to-right-10'
                : 'left-0 border-r data-open:slide-in-from-left-10 data-closed:slide-out-to-left-10',
              TAILLE[size]
            ),
        className
      )}
    >
      {#if estMobile}
        <!-- La poignée glisse toujours, même quand le contenu est défilé. -->
        <div data-grabber class="flex shrink-0 justify-center py-2.5">
          <div class="h-1 w-9 rounded-full bg-muted-foreground/40"></div>
        </div>
      {/if}

      <div class={cn('shrink-0 px-6', estMobile ? 'pb-2' : 'pt-6 pb-2')}>
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold">
          {#if Icon}<Icon class="h-5 w-5 text-primary" />{/if}
          {title}
        </Dialog.Title>
        {#if description}
          <Dialog.Description class="mt-1 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>
        {/if}
        {#if header}{@render header()}{/if}
      </div>

      <div data-sheet-scroll class="flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
        {@render children()}
      </div>

      {#if footer}
        <!--
          Le pied colle en bas sur téléphone : sur une feuille à mi-hauteur, un
          bouton posé dans le flux passe sous le pli et devient introuvable.
        -->
        <div
          class={cn(
            'shrink-0 border-t border-border bg-card px-6 py-3',
            estMobile && 'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
          )}
          style={estMobile ? 'margin-bottom: var(--nba-sheet-offset, 0px)' : undefined}
        >
          {@render footer()}
        </div>
      {/if}

      {#if showCloseButton && !estMobile}
        <Dialog.Close>
          {#snippet child({ props: propsFermeture })}
            <Button
              variant="ghost"
              size="icon-sm"
              {...propsFermeture}
              class="absolute right-3"
              style="top: max(0.75rem, env(safe-area-inset-top, 0px))"
            >
              <XIcon />
              <span class="sr-only">Fermer</span>
            </Button>
          {/snippet}
        </Dialog.Close>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
