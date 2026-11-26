<script lang="ts">
  import DiscoveryBubble from './DiscoveryBubble.svelte';

  /**
   * Présente l'onglet « Interclubs » du calendrier, une fois par appareil : la même bulle que
   * celle du compte, posée sous le sélecteur de vue, pointe sur l'onglet. Ouvrir l'onglet, c'est
   * l'avoir découvert : sur la vue « Interclubs », elle ne paraît pas.
   */
  let { active = false }: { active?: boolean } = $props();

  const KEY = 'nba:interclubs-tab-hint:v1';
  const TAB = 'a[href="/agenda?vue=interclubs"]';
  let visible = $state(false);
  let anchor = $state<HTMLDivElement | null>(null);
  /** Abscisse de la pointe, mesurée sur l'onglet : le sélecteur défile et sa largeur varie. */
  let arrowLeft = $state('50%');

  function remember() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
  }

  // Lu après montage seulement : le rendu serveur ne connaît pas l'appareil.
  $effect(() => {
    if (active) {
      remember();
      return;
    }
    // Une bulle à la fois : après celle du compte, puis celle de l'icône d'agenda quand elle existe.
    const read = () => {
      try {
        const accountSeen = localStorage.getItem('nba:account-hint:v1') === '1';
        const agendaSeen = !document.querySelector('[data-testid="calendar-subscribe"]') || localStorage.getItem('nba:calendar-feed-hint:v1') === '1';
        visible = localStorage.getItem(KEY) !== '1' && accountSeen && agendaSeen;
      } catch {
        visible = false;
      }
    };
    read();
    window.addEventListener('nba:hint-dismissed', read);
    return () => window.removeEventListener('nba:hint-dismissed', read);
  });

  function dismiss() {
    visible = false;
    remember();
  }

  /*
    L'onglet visé s'éclaire tant que la bulle est là, et la pointe le suit. Le sélecteur est
    rendu côté serveur (SegmentedNav.astro) : on lui pose la classe d'ici, et on la retire en partant.
  */
  const HIGHLIGHT = ['ring-2', 'ring-primary', 'text-primary'];
  $effect(() => {
    const tab = document.querySelector<HTMLAnchorElement>(TAB);
    if (!tab || !visible || !anchor) return;
    tab.classList.add(...HIGHLIGHT);
    const place = () => {
      const t = tab.getBoundingClientRect();
      const a = anchor!.getBoundingClientRect();
      arrowLeft = `${Math.round(t.left + t.width / 2 - a.left - 6)}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => {
      tab.classList.remove(...HIGHLIGHT);
      window.removeEventListener('resize', place);
    };
  });
</script>

<!-- Ancre sans hauteur sous le sélecteur : la bulle passe par-dessus la liste, sans la pousser. -->
<div class="relative" bind:this={anchor}>
  {#if visible}
    <DiscoveryBubble
      testid="interclubs-tab-hint"
      class="absolute inset-x-0 -top-2 sm:right-auto sm:w-80"
      arrowStyle={`left: ${arrowLeft}`}
      title="Nouveau : l'onglet Interclubs"
      text="Quand et où jouent toutes les équipes du club, pour venir les encourager. Filtrez par équipe ; les vôtres sont marquées « Mon équipe »."
      primary={{ label: 'Voir les rencontres', href: '/agenda?vue=interclubs', onclick: remember }}
      secondary={{ label: 'Plus tard', onclick: dismiss }}
    />
  {/if}
</div>
