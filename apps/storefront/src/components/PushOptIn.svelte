<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * Activation des notifications push pour l'appareil courant.
   *
   * Sur iOS, `Notification` et `PushManager` n'existent que si l'application a été
   * installée sur l'écran d'accueil : le composant explique la marche à suivre au
   * lieu d'afficher un bouton qui échouerait.
   */

  const VAPID_PUBLIC_KEY = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY || '';

  type State = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

  let {
    /**
     * `banner` : format compact pour l'accueil, masqué dès que tout est en ordre —
     * un bandeau permanent finit par ne plus être lu.
     * `card` : encart détaillé des écrans de réglages, toujours visible.
     */
    variant = 'card',
    showSettingsLink = true
  }: { variant?: 'card' | 'banner'; showSettingsLink?: boolean } = $props();

  let state = $state<State>('loading');
  let busy = $state(false);
  let error = $state('');

  /** La clé applicative doit être passée en octets bruts à `subscribe()`. */
  function urlBase64ToUint8Array(value: string): Uint8Array {
    const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function isIOS(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  function isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone === true)
    );
  }

  async function resolveState(): Promise<State> {
    if (!VAPID_PUBLIC_KEY) return 'unsupported';
    if (!('serviceWorker' in navigator)) return 'unsupported';

    if (!('Notification' in window) || !('PushManager' in window)) {
      // Safari n'expose l'API push qu'en mode application installée.
      return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
    }
    if (Notification.permission === 'denied') return 'denied';

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? 'on' : 'off';
  }

  onMount(async () => {
    try {
      state = await resolveState();
    } catch {
      state = 'unsupported';
    }
  });

  async function enable() {
    busy = true;
    error = '';
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        state = permission === 'denied' ? 'denied' : 'off';
        return;
      }

      // `ready` plutôt que `getRegistration` : l'abonnement exige un SW actif.
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!res.ok) {
        // L'abonnement navigateur existerait sans contrepartie serveur : on l'annule.
        await subscription.unsubscribe();
        throw new Error("L'activation a échoué. Réessayez plus tard.");
      }
      state = 'on';
    } catch (e) {
      error = e instanceof Error ? e.message : "L'activation a échoué.";
    } finally {
      busy = false;
    }
  }

  async function disable() {
    busy = true;
    error = '';
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      state = 'off';
    } catch (e) {
      error = e instanceof Error ? e.message : 'La désactivation a échoué.';
    } finally {
      busy = false;
    }
  }
</script>

{#if state !== 'loading' && state !== 'unsupported' && !(variant === 'banner' && state === 'on')}
  <div class="rounded-xl border border-border bg-card {variant === 'banner' ? 'p-4' : 'p-5'}">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="text-sm font-semibold text-foreground">Notifications</div>
        <p class="text-xs text-muted-foreground mt-1">
          {#if state === 'on'}
            Cet appareil reçoit les annonces du club.
          {:else if state === 'needs-install'}
            Sur iPhone et iPad, installez d'abord l'application : bouton Partager, puis « Sur l'écran
            d'accueil ». Les notifications seront ensuite activables depuis l'application.
          {:else if state === 'denied'}
            Les notifications sont bloquées pour ce site. Réautorisez-les dans les réglages de votre
            navigateur pour pouvoir les activer.
          {:else}
            Soyez prévenu des annonces du club et du suivi de vos demandes.
          {/if}
        </p>
        {#if error}
          <p class="text-xs text-destructive mt-2">{error}</p>
        {/if}
        {#if showSettingsLink && state !== 'needs-install'}
          <a
            href="/notifications"
            class="inline-block text-xs font-medium text-primary mt-2 underline underline-offset-2"
          >
            Choisir ce que je reçois
          </a>
        {/if}
      </div>

      {#if state === 'on'}
        <button
          type="button"
          class="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          disabled={busy}
          onclick={disable}
        >
          {busy ? '…' : 'Désactiver'}
        </button>
      {:else if state === 'off'}
        <button
          type="button"
          class="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={busy}
          onclick={enable}
        >
          {busy ? '…' : 'Activer'}
        </button>
      {/if}
    </div>
  </div>
{/if}
