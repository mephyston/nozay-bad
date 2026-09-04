<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Download, Share, ExternalLink } from '@lucide/svelte';
  import { Button } from '../ui/button';
  import { detectInstallTarget, chromeIntentUrl, type InstallTarget } from '../../lib/pwa-install';

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
  // Qui sait installer quoi (Safari seul sur iOS, Chrome seul sur Android…) : voir
  // lib/pwa-install.ts. Hors 'default', on n'attend pas `beforeinstallprompt` : on
  // explique la marche à suivre.
  let target = $state<InstallTarget>('default');
  let chromeUrl = $state('');
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

    target = detectInstallTarget(window.navigator.userAgent, window.navigator.maxTouchPoints);

    if (target !== 'default') {
      // iOS n'expose pas `beforeinstallprompt` ; sur Android hors Chrome, le WebAPK est
      // bloqué (Samsung) ou absent : dans les deux cas, on affiche la marche à suivre.
      if (target === 'android-other') chromeUrl = chromeIntentUrl(window.location.href);
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
      {#if target === 'ios-safari'}
        <span class="flex items-center gap-1 flex-wrap">
          Installer l'application : appuyez sur <Share class="w-4 h-4 inline" /> puis « Sur l'écran d'accueil ».
        </span>
      {:else if target === 'ios-other'}
        <span>Pour installer l'application, ouvrez ce site dans Safari puis « Sur l'écran d'accueil ».</span>
      {:else if target === 'android-other'}
        <span>Ce navigateur ne peut pas installer l'application : ouvrez le site dans Chrome pour le faire.</span>
      {:else}
        <span>Ajoutez NBA à votre écran d'accueil pour une meilleure expérience.</span>
      {/if}
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if target === 'android-other'}
        <Button variant="secondary" size="sm" class="h-8 text-xs px-3 font-bold" href={chromeUrl}>
          <ExternalLink class="w-3.5 h-3.5 mr-1" /> Ouvrir dans Chrome
        </Button>
      {:else if target === 'default'}
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
