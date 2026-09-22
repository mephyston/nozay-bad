<script lang="ts">
  import { Menu as MenuIcon, Search, SlidersHorizontal, Plus } from '@lucide/svelte';
  import MenuSearchField from './MenuSearchField.svelte';
  import * as DropdownMenu from '../ui/dropdown-menu/index.js';
  import { dockDePage } from '../../lib/page-dock.svelte.js';

  /**
   * La barre du bas, sur téléphone.
   *
   * Vit dans le design system et non dans l'application : c'est le seul endroit où
   * Storybook la voit, et donc le seul où un test peut ouvrir son menu. Elle avait
   * livré deux défauts qu'aucun test ne pouvait attraper — un registre dupliqué par
   * le bundler, puis un menu qui ne rendait rien.
   *
   * Des cercles en verre, séparés, comme dans l'app Météo. **Menu** à gauche ouvre
   * le menu — avec sa pilule de recherche déjà déployée en bas. À droite, ce que
   * l'écran courant y met : sa **recherche** et son **action principale**.
   *
   * La loupe ne cherche plus dans le menu : cette recherche-là existe déjà dans le
   * menu ouvert, et deux loupes voulant dire deux choses différentes est ce qu'une
   * barre du bas pardonne le moins. Ce qui se cherche ici est ce qui est à l'écran.
   *
   * L'action principale d'une liste — « Nouveau produit », « Nouveau gymnase » —
   * vivait en haut de la barre d'outils, là où un pouce ne va pas et d'où elle
   * défilait hors de l'écran. Elle descend à portée.
   *
   * Au défilement, dans les deux sens, les cercles se font petits ; ils reviennent
   * dès que le doigt s'arrête. La recherche ouverte suspend la rétractation.
   */
  let {
    onMenuClick,
    scrollContainer
  }: {
    onMenuClick: () => void;
    /** L'élément qui défile : le contenu de l'administration, pas la fenêtre. */
    scrollContainer?: HTMLElement | null;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let compact = $state(false);

  /*
    L'état est relu à chaque notification plutôt que lié par une rune : le registre
    vit sur `globalThis`, hors de portée de la réactivité de Svelte, parce que le
    bundler duplique le module qui le porterait autrement.
  */
  let recherche = $state(dockDePage.lire().recherche);
  let portee = $state(dockDePage.lire().portee);
  let actions = $state(dockDePage.lire().actions);
  let groupe = $state(dockDePage.lire().groupe);

  $effect(() =>
    dockDePage.sAbonner(() => {
      const etat = dockDePage.lire();
      recherche = etat.recherche;
      portee = etat.portee;
      actions = etat.actions;
      groupe = etat.groupe;
    })
  );
  /**
   * Une seule action garde son icône ; plusieurs s'effacent derrière un « + ».
   *
   * Sauf si l'écran dit autre chose : un `+` annonce une création, ce que deux boutons
   * d'impression ne sont pas.
   */
  const IconeAction = $derived(
    actions.length === 1 ? ((actions[0].icon as any) ?? Plus) : ((groupe?.icon as any) ?? Plus)
  );
  const libelleAction = $derived(
    actions.length === 1 ? actions[0].label : (groupe?.label ?? 'Ajouter')
  );
  const CERCLE_ACTION = $derived(
    'dock-circle flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-lg transition-[width,opacity] duration-300 ' +
      (open ? 'pointer-events-none w-0 opacity-0' : 'w-14')
  );

  const listeReduite = $derived(!!recherche && (!!recherche.valeur || !!recherche.filtres?.actif));

  function openSearch() {
    // Repeuplé avec ce qui est appliqué : on rouvre pour corriger, pas pour retaper.
    query = recherche?.valeur ?? '';
    open = true;
    compact = false;
  }

  function closeSearch() {
    open = false;
    query = '';
  }

  function valider() {
    recherche?.onSubmit(query);
    // Pas de voile ni de panneau de résultats : ce qui filtre est la liste derrière.
    // La validation navigue le plus souvent, ce qui remonte l'îlot et referme d'office.
    open = false;
  }

  // Un écran sans recherche ne doit pas garder un champ ouvert derrière lui.
  $effect(() => {
    if (!recherche && open) closeSearch();
  });

  /*
    Rétractation au défilement, dans les deux sens ; retour au repos du doigt.

    Un effet et non `onMount` : le conteneur arrive par `bind:this` du layout, posé
    après le montage de cette barre — lu une seule fois au montage, il serait encore nul.
  */
  $effect(() => {
    const container = scrollContainer;
    if (!container) return;
    let last = container.scrollTop;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = container.scrollTop;
        if (Math.abs(y - last) <= 6) return;
        last = y;
        if (!open) compact = y > 24;
        clearTimeout(timer);
        timer = setTimeout(() => (compact = false), 350);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  });
</script>

<div
  class="dock md:hidden fixed inset-x-4 z-50 flex items-end justify-between {open ? 'gap-0' : 'gap-3'} {compact ? 'is-compact' : ''}"
  style="bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
  data-admin-dock
>
  <button
    type="button"
    class="glass-surface dock-circle flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-foreground transition-[width,opacity] duration-300 {open ? 'w-0 border-0 opacity-0 pointer-events-none' : 'w-14'}"
    aria-label="Ouvrir le menu"
    aria-hidden={open}
    tabindex={open ? -1 : 0}
    onclick={onMenuClick}
  >
    <MenuIcon class="h-6 w-6" />
  </button>

  <!--
    Toujours `flex-1`, même fermé : c'est ce qui permet au champ de s'étirer depuis
    le cercle. Dans un conteneur dimensionné sur son contenu, la largeur du parent
    sauterait d'un coup et il n'y aurait plus rien à animer.
  -->
  <div class="relative flex min-w-0 flex-1 items-end justify-end gap-3">
    {#if portee}
      <!--
        La portée : ce qu'on regarde, affiché en clair.

        Ni la loupe — qui réduit — ni le `+` — qui crée. Elle affiche sa valeur plutôt
        qu'une icône, parce qu'une portée qu'on ne voit pas ne se vérifie jamais : sur
        un rapport, savoir quel exercice on lit vaut mieux que de savoir qu'on peut en
        changer.
      -->
      <button
        type="button"
        class="glass-surface dock-circle flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full px-4 text-sm font-semibold text-foreground transition-[max-width,opacity,padding] duration-300 {open
          ? 'pointer-events-none max-w-0 px-0 opacity-0'
          : 'max-w-40'}"
        aria-label="{portee.label} : {portee.valeur}"
        aria-hidden={open}
        tabindex={open ? -1 : 0}
        onclick={portee.ouvrir}
      >
        <span class="truncate">{portee.valeur}</span>
      </button>
    {/if}

    {#if recherche}
      <!--
        La coquille porte la largeur, son contenu la remplit : de 3,5 rem à toute
        la place, le cercle s'étire en pilule. Les deux ont la même hauteur, le même
        rayon et la même surface, ce qui rend la transformation continue à l'œil.
      -->
      <div class="dock-search min-w-0" style="width: {open ? '100%' : '3.5rem'}">
        {#if open}
          <MenuSearchField
            bind:query
            placeholder={recherche.placeholder}
            onClose={closeSearch}
            onSubmit={valider}
          >
            {#snippet trailing()}
              {#if recherche?.filtres}
                <button
                  type="button"
                  onclick={recherche.filtres.ouvrir}
                  class="relative flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Filtres"
                >
                  <SlidersHorizontal class="size-5" />
                  {#if recherche.filtres.actif}
                    <span class="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary"></span>
                  {/if}
                </button>
              {/if}
            {/snippet}
          </MenuSearchField>
        {:else}
          <button
            type="button"
            class="glass-surface dock-circle relative flex h-14 w-full items-center justify-center rounded-full text-foreground"
            aria-label={listeReduite ? 'Liste réduite : modifier' : recherche.placeholder}
            onclick={openSearch}
          >
            <Search class="h-6 w-6" />
            {#if listeReduite}
              <!-- Un terme ou un filtre : la barre le dit même quand les jetons ont défilé. -->
              <span class="absolute right-4 top-4 size-2 rounded-full bg-primary"></span>
            {/if}
          </button>
        {/if}
      </div>
    {/if}

    {#if actions.length > 0}
      <!--
        Les deux cas s'écrivent séparément, et c'est délibéré : le déclencheur d'un
        menu reçoit ses gestionnaires de `bits-ui` par un spread, et poser un
        `onclick` après lui l'écrasait — le menu ne s'ouvrait plus. Un spread doit
        rester le dernier mot sur un déclencheur.
      -->
      {#if actions.length === 1}
        <button
          type="button"
          class={CERCLE_ACTION}
          aria-label={libelleAction}
          aria-hidden={open}
          tabindex={open ? -1 : 0}
          onclick={actions[0].run}
        >
          <IconeAction class="h-6 w-6" />
        </button>
      {:else}
        <!--
          Au-delà d'une action, un petit menu en verre s'ouvre au-dessus du bouton —
          l'ellipse de l'app Météo. La barre, elle, ne bouge pas d'un pixel : c'est
          ce qui permet au grand livre d'offrir trois écritures sans la déformer.
        -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                type="button"
                class={CERCLE_ACTION}
                aria-label={libelleAction}
                aria-hidden={open}
                tabindex={open ? -1 : 0}
                {...props}
              >
                <IconeAction class="h-6 w-6" />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            side="top"
            align="end"
            sideOffset={12}
            style="--glass-base: var(--popover); --glass-opacity: 96%"
            class="glass-surface min-w-52 rounded-2xl border-0 p-1.5"
          >
            {#each actions as action (action.id)}
              {@const Icone = action.icon as any}
              <DropdownMenu.Item onclick={action.run} class="cursor-pointer gap-2.5 rounded-xl py-2.5">
                {#if Icone}<Icone class="size-4" />{/if}
                {action.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* L'étirement du cercle en pilule, et son repli. */
  .dock-search {
    transition: width 320ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Rétractation : chaque cercle rétrécit depuis le bas, sans rien déplacer dans la page. */
  .dock-circle {
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .dock.is-compact .dock-circle {
    transform: scale(0.78);
  }

  /* L'enfoncement : le doigt doit sentir qu'il a touché avant que l'écran ne change. */
  .dock-circle:active {
    transform: scale(0.9);
    transition-duration: 90ms;
  }
  .dock.is-compact .dock-circle:active {
    transform: scale(0.7);
  }

  @media (prefers-reduced-motion: reduce) {
    .dock-circle,
    .dock-search {
      transition: none;
    }
  }
</style>
