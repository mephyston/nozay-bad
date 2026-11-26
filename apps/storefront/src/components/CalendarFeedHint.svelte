<script lang="ts">
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

  /** La pointe vise le milieu de l'onglet, quelle que soit la largeur de la barre. */
  const arrowLeft = $derived(`calc(0.75rem + (100% - 1.5rem) * ${(tabIndex + 0.5) / tabCount} - 0.375rem)`);
</script>

{#if visible}
  <div
    role="status"
    data-testid="calendar-feed-hint"
    class="fixed inset-x-3 z-50 md:hidden"
    style="bottom: calc(env(safe-area-inset-bottom, 0px) + 5.25rem)"
  >
    <div class="relative rounded-xl border border-border bg-popover p-4 text-xs text-popover-foreground shadow-lg">
      <p class="font-semibold text-foreground">Nouveau : l'agenda du club dans votre téléphone</p>
      <p class="mt-1 text-muted-foreground">
        Les rendez-vous du club, vos rencontres et vos séances de jeu libre s'ajoutent à votre
        calendrier, et suivent les changements.
      </p>
      <div class="mt-3 flex gap-2">
        <a
          href="/agenda?abonnement"
          onclick={dismiss}
          class="inline-flex min-h-[36px] items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Découvrir
        </a>
        <button
          type="button"
          onclick={dismiss}
          class="inline-flex min-h-[36px] items-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
        >
          Plus tard
        </button>
      </div>
    </div>
    <span
      class="absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-border bg-popover"
      style="left: {arrowLeft}"
      aria-hidden="true"
    ></span>
  </div>
{/if}
