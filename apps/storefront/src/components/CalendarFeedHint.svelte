<script lang="ts">
  import DiscoveryBubble from './DiscoveryBubble.svelte';
  /**
   * Bulle de nouveauté : l'agenda du club se synchronise avec le calendrier du téléphone.
   *
   * Même principe que la bulle du menu du compte (`UserMenu`) : une fois par appareil, et
   * jamais en même temps qu'elle — deux bulles à la fois ne se lisent pas. Elle attend donc
   * que celle du compte ait été vue, et apparaît dès qu'on la referme.
   *
   * Posée au-dessus de l'onglet « Calendrier » de la barre du bas ; « Découvrir » ouvre
   * directement la feuille d'abonnement (`/agenda?abonnement`).
   */
  // `visible` remonte à la barre : l'onglet visé s'éclaire tant que la bulle est là.
  let { tabIndex, tabCount, visible = $bindable(false) }: { tabIndex: number; tabCount: number; visible?: boolean } = $props();

  const HINT_KEY = 'nba:calendar-feed-hint:v1';
  const ACCOUNT_HINT_KEY = 'nba:account-hint:v1';


  function read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return '1';
    }
  }

  function evaluate() {
    visible = read(HINT_KEY) !== '1' && read(ACCOUNT_HINT_KEY) === '1';
  }

  // Lu après montage seulement : le rendu serveur ne connaît pas l'appareil.
  $effect(() => {
    evaluate();
    window.addEventListener('nba:hint-dismissed', evaluate);
    return () => window.removeEventListener('nba:hint-dismissed', evaluate);
  });

  function dismiss() {
    visible = false;
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {}
  }

  /** La pointe vise le milieu de l'onglet : la bulle a la largeur de la barre, aux mêmes marges. */
  const arrowLeft = $derived(`calc(0.25rem + (100% - 0.5rem) * ${(tabIndex + 0.5) / tabCount} - 0.375rem)`);
</script>

{#if visible}
  <DiscoveryBubble
    testid="calendar-feed-hint"
    class="fixed inset-x-3 md:hidden"
    style="bottom: calc(env(safe-area-inset-bottom, 0px) + 5.25rem)"
    arrow="bottom"
    arrowStyle={`left: ${arrowLeft}`}
    title="Nouveau : l'agenda du club dans votre téléphone"
    text="Les rendez-vous du club, vos rencontres et vos séances de jeu libre s'ajoutent à votre calendrier, et suivent les changements."
    primary={{ label: 'Découvrir', href: '/agenda?abonnement', onclick: dismiss }}
    secondary={{ label: 'Plus tard', onclick: dismiss }}
  />
{/if}
