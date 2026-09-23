<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
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
    titreVisible = true,
    headerLeading,
    headerTrailing,
    footerHidden = false,
    onOpenChange,
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
     * Le titre reste le nom de la modale, mais n'est plus dessiné.
     *
     * Pour un contenu qui porte déjà sa propre barre — l'éditeur de page, dont la
     * croix et la validation vivent dans le composant et non ici. Sans cela il
     * fallait passer un titre vide, et la feuille dessinait par-dessus la barre un
     * bloc d'en-tête sans rien dedans : une bande morte, et plus aucun nom annoncé
     * par les technologies d'assistance.
     */
    titreVisible?: boolean;
    /**
     * Destination du portail. Sert aux stories, dont la capture ne photographie que
     * `#storybook-root` : porté sur `document.body`, le contenu en sortirait.
     */
    portalProps?: { to?: string | HTMLElement };
    class?: string;
    /**
     * Actions posées de part et d'autre du titre, sur téléphone : la barre de
     * navigation d'une modale iOS. Elles y vivent **et non en pied** parce qu'une
     * feuille est ancrée en bas — réduire sa hauteur quand le clavier s'ouvre ne
     * remonte pas son pied, que le clavier recouvre alors entièrement.
     */
    headerLeading?: Snippet;
    headerTrailing?: Snippet;
    /**
     * Masque le pied sans que l'appelant ait à ne pas fournir le snippet — ce qu'un
     * composant ne peut pas décider conditionnellement. Sans cela, un pied vide
     * laisserait sa bordure et son fond en travers de la feuille.
     */
    footerHidden?: boolean;
    /**
     * Prévenu à chaque ouverture et fermeture, y compris celles que la feuille décide
     * elle-même — voile, Échap, bouton de fermeture, geste vers le bas.
     *
     * Indispensable dès que l'ouverture reflète un état extérieur : sans elle, il fallait
     * un miroir et deux effets qui se répondaient, et la feuille ne se refermait plus.
     */
    onOpenChange?: (open: boolean) => void;
    header?: Snippet;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  const requete = creerIsMobile();
  const estMobile = $derived(requete.current);

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

<Dialog.Root bind:open {onOpenChange}>
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

      <!--
        Sur téléphone, une feuille doit porter une sortie **visible**.

        Le bouton de fermeture n'était rendu qu'au-dessus de 768 px : au doigt, il ne
        restait que le geste vers le bas et le voile. Or une feuille qui monte à 95 % de
        l'écran ne laisse presque pas de voile, et un contenu défilant capte le
        glissement — on s'y retrouvait enfermé. Les écrans qui fournissent leur propre
        `headerLeading` gardent le leur : c'est le cas des formulaires, dont la croix
        annule la saisie.
      -->
      {@const fermetureDoffice = estMobile && showCloseButton && !headerLeading}
      {@const barreHaute = estMobile && (headerLeading || headerTrailing || fermetureDoffice)}
      {@const enTete = barreHaute || (titreVisible && !!title) || !!description || !!header}
      {#if !enTete}
        <!-- Rien à dessiner : le titre reste, pour les technologies d'assistance. -->
        <Dialog.Title class="sr-only">{title}</Dialog.Title>
      {:else}
      <div class={cn('shrink-0 px-6', estMobile ? 'pb-2' : 'pt-6 pb-2')}>
        {#if barreHaute}
          <!-- Barre de navigation : retrait à gauche, titre au centre, validation à droite. -->
          <div class="flex items-center gap-2">
            <div class="flex w-14 shrink-0 justify-start">
              {#if headerLeading}
                {@render headerLeading()}
              {:else if fermetureDoffice}
                <Dialog.Close>
                  {#snippet child({ props: propsFermeture })}
                    <Button
                      variant="ghost"
                      {...propsFermeture}
                      class="glass-surface size-11 rounded-full p-0"
                      style="--glass-base: var(--card)"
                      aria-label="Fermer"
                    >
                      <XIcon class="size-5" />
                    </Button>
                  {/snippet}
                </Dialog.Close>
              {/if}
            </div>
            <Dialog.Title class="min-w-0 flex-1 truncate text-center text-base font-semibold">
              {title}
            </Dialog.Title>
            <div class="flex w-14 shrink-0 justify-end">
              {#if headerTrailing}{@render headerTrailing()}{/if}
            </div>
          </div>
        {:else}
          <Dialog.Title
            class={cn(
              'flex items-center gap-2 text-base font-semibold',
              !titreVisible && 'sr-only'
            )}
          >
            {#if Icon && titreVisible}<Icon class="h-5 w-5 text-primary" />{/if}
            {title}
          </Dialog.Title>
        {/if}
        <!--
          Sous une barre de navigation, la description ne s'affiche pas : la hauteur
          d'un téléphone est rare, et deux lignes d'explication repoussent d'autant
          les champs sous le clavier. Elle reste rendue pour les technologies
          d'assistance, qui l'annoncent avec le titre.
        -->
        {#if description}
          <Dialog.Description
            class={cn('mt-1 text-sm text-muted-foreground', barreHaute && 'sr-only')}
          >
            {description}
          </Dialog.Description>
        {/if}
        {#if header}{@render header()}{/if}
      </div>
      {/if}

      <div data-sheet-scroll class="flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
        {@render children()}
      </div>

      {#if footer && !footerHidden}
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
