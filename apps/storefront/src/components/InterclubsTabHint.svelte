<script lang="ts">
  /**
   * Présente l'onglet « Interclubs » du calendrier, une fois par appareil.
   *
   * Un encart posé sous le sélecteur de vue, pas une bulle flottante : il ne masque rien et ne
   * se dispute pas l'écran avec celle de l'abonnement, qui n'apparaît pas sur le calendrier.
   * Ouvrir l'onglet, c'est l'avoir découvert : sur la vue « Interclubs », il se range seul.
   */
  let { active = false }: { active?: boolean } = $props();

  const KEY = 'nba:interclubs-tab-hint:v1';
  let visible = $state(false);

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
    try {
      visible = localStorage.getItem(KEY) !== '1';
    } catch {
      visible = false;
    }
  });

  function dismiss() {
    visible = false;
    remember();
  }
</script>

{#if visible}
  <div role="status" data-testid="interclubs-tab-hint" class="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
    <p class="font-semibold text-foreground">Nouveau : l'onglet Interclubs</p>
    <p class="mt-1 text-muted-foreground">
      Quand et où jouent toutes les équipes du club, pour venir les encourager. Filtrez par équipe ; les vôtres sont
      marquées « Mon équipe ».
    </p>
    <div class="mt-2 flex gap-2">
      <a href="/agenda?vue=interclubs" onclick={remember} class="inline-flex min-h-[36px] items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Voir les rencontres
      </a>
      <button type="button" onclick={dismiss} class="inline-flex min-h-[36px] items-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
        Plus tard
      </button>
    </div>
  </div>
{/if}
