<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Download, Share } from '@lucide/svelte';
  import { Button } from '../ui/button';

  // Le rejet expire au bout de 30 jours. Auparavant il était définitif : un clic
  // malheureux masquait la bannière à vie sur l'appareil. C'est bloquant depuis
  // que l'installation conditionne la réception des notifications push sur iOS.
  const DISMISS_KEY = 'pwa_install_dismissed_at';
  const LEGACY_DISMISS_KEY = 'pwa_install_dismissed';
  const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

  type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  let showBanner = $state(false);
  let isIOS = $state(false);
  // Sur iOS, seul Safari sait poser une vraie PWA sur l'écran d'accueil : les autres
  // navigateurs n'ont pas le menu « Sur l'écran d'accueil » qui installe l'app.
  let isIOSSafari = $state(false);
  let deferredPrompt = $state<InstallPromptEvent | null>(null);

  // Safari refuse l'accès à localStorage (SecurityError) quand les cookies sont
  // bloqués : tout accès non protégé faisait échouer le montage et la bannière
  // n'apparaissait jamais sur iOS.
  function readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* stockage indisponible : le rejet ne dure que la session */
    }
  }

  function detectIOS(ua: string): boolean {
    if (/iphone|ipad|ipod/.test(ua)) return true;
    // iPadOS 13+ s'annonce comme un Mac de bureau ; seul maxTouchPoints le trahit.
    return /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }

  function isDismissed(): boolean {
    if (readStorage(LEGACY_DISMISS_KEY) === 'true') {
      // Migration de l'ancien rejet définitif vers un rejet daté.
      writeStorage(DISMISS_KEY, String(Date.now()));
      try {
        localStorage.removeItem(LEGACY_DISMISS_KEY);
      } catch {
        /* ignore */
      }
    }
    const dismissedAt = Number(readStorage(DISMISS_KEY));
    if (!dismissedAt) return false;
    return Date.now() - dismissedAt < DISMISS_MS;
  }

  onMount(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone);
    if (isStandalone) return;

    // Bannière réservée aux appareils tactiles. On teste le pointeur plutôt qu'une
    // largeur CSS : `md:hidden` masquait l'iPad (768 px+) et l'iPhone en paysage,
    // c'est-à-dire précisément les cas où l'installation est utile.
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    if (isDismissed()) return;

    const ua = window.navigator.userAgent.toLowerCase();
    isIOS = detectIOS(ua);
    isIOSSafari = isIOS && !/crios|fxios|edgios|opios|opt\//.test(ua);

    if (isIOS) {
      // iOS n'expose pas `beforeinstallprompt` : on affiche la marche à suivre.
      const timer = setTimeout(() => {
        showBanner = true;
      }, 2000);
      return () => clearTimeout(timer);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as InstallPromptEvent;
      showBanner = true;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  });

  function dismiss() {
    showBanner = false;
    writeStorage(DISMISS_KEY, String(Date.now()));
  }

  async function install() {
    if (!deferredPrompt) {
      dismiss();
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
    deferredPrompt = null;
  }
</script>

{#if showBanner}
  <div
    class="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground p-3 shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-full duration-300"
  >
    <div class="flex-1 text-sm font-medium leading-tight">
      {#if isIOSSafari}
        <span class="flex items-center gap-1 flex-wrap">
          Installer l'application : appuyez sur <Share class="w-4 h-4 inline" /> puis « Sur l'écran d'accueil ».
        </span>
      {:else if isIOS}
        <span>Pour installer l'application, ouvrez ce site dans Safari puis « Sur l'écran d'accueil ».</span>
      {:else}
        <span>Ajoutez NBA à votre écran d'accueil pour une meilleure expérience.</span>
      {/if}
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if !isIOS}
        <Button variant="secondary" size="sm" class="h-8 text-xs px-3 font-bold" onclick={install}>
          <Download class="w-3.5 h-3.5 mr-1" /> Installer
        </Button>
      {/if}
      <button
        type="button"
        class="p-1.5 hover:bg-black/10 rounded-full transition-colors"
        aria-label="Fermer"
        onclick={dismiss}
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
{/if}
