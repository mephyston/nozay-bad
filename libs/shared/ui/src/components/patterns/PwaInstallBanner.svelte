<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Download, Share } from '@lucide/svelte';
  import { Button } from '../ui/button';
  
  let showBanner = $state(false);
  let isIOS = $state(false);
  let deferredPrompt = $state<any>(null);

  onMount(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone);
    if (isStandalone) {
      return;
    }

    // Check if dismissed previously
    if (localStorage.getItem('pwa_install_dismissed') === 'true') {
      return;
    }

    // Detect iOS for specific instructions
    const ua = window.navigator.userAgent.toLowerCase();
    isIOS = /iphone|ipad|ipod/.test(ua);

    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, we just show the banner after a small delay
      setTimeout(() => {
        showBanner = true;
      }, 2000);
    } else {
      // Chrome/Android
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showBanner = true;
      });
    }
  });

  function dismiss() {
    showBanner = false;
    localStorage.setItem('pwa_install_dismissed', 'true');
  }

  async function install() {
    if (isIOS) {
      // Pour iOS, l'utilisateur doit le faire manuellement, le bouton sert juste à dire OK
      dismiss();
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismiss();
      }
      deferredPrompt = null;
    }
  }
</script>

{#if showBanner}
  <div class="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground p-3 shadow-md flex items-center justify-between gap-3 md:hidden animate-in slide-in-from-top-full duration-300">
    <div class="flex-1 text-sm font-medium leading-tight">
      {#if isIOS}
        <span class="flex items-center gap-1">Installer l'application : appuyez sur <Share class="w-4 h-4 inline" /> puis "Sur l'écran d'accueil".</span>
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
      <button type="button" class="p-1.5 hover:bg-black/10 rounded-full transition-colors" aria-label="Fermer" onclick={dismiss}>
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
{/if}
