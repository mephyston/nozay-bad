<script lang="ts">
  import { onMount } from 'svelte';
  import { QrCode, ShoppingBasket, User, Wallet } from '@lucide/svelte';
  import { Button } from '@nba/ui';

  /**
   * Le guide de première visite : ce que fait chaque onglet, et surtout que la carte se charge
   * à la buvette en présentant son QR code. Une fois par appareil ; « Revoir le guide », dans
   * l'onglet Compte, le rouvre. Le souvenir vit dans le navigateur : sans stockage, le guide se
   * montre simplement de nouveau, ce qui ne gêne personne.
   */
  const KEY = 'buvette_guide_vu';
  let { forceOpen = false }: { forceOpen?: boolean } = $props();
  let open = $state(false);

  const steps = [
    { icon: Wallet, title: 'Ma carte', text: 'Votre solde et vos transactions. Touchez une transaction pour en voir le détail.' },
    { icon: QrCode, title: 'Mon QR', text: 'Présentez-le à la buvette pour payer, et pour recharger votre carte. Il se renouvelle tout seul ; un code à dicter s\'affiche dessous.' },
    { icon: ShoppingBasket, title: 'Commander', text: 'Préparez votre commande sur votre téléphone, puis présentez votre QR code à la buvette pour la récupérer.' },
    { icon: User, title: 'Compte', text: 'Déconnectez un téléphone perdu, ou supprimez votre carte quand son solde est à zéro.' }
  ];

  onMount(() => {
    if (forceOpen) {
      open = true;
      return;
    }
    try {
      open = localStorage.getItem(KEY) !== '1';
    } catch {
      open = true;
    }
  });

  function close() {
    open = false;
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* Sans stockage, le guide reviendra : sans conséquence. */
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="guide-titre">
    <div class="bg-background w-full max-w-md space-y-4 rounded-3xl p-5 shadow-xl" style="margin-bottom: env(safe-area-inset-bottom, 0px)">
      <h2 id="guide-titre" class="text-xl font-semibold">Bienvenue sur votre carte buvette</h2>
      <p class="bg-primary/10 border-primary rounded-2xl border p-3 text-sm">
        <strong>Pour charger votre carte</strong>, passez à la buvette et présentez votre QR code : un bénévole la recharge en espèces ou par carte bancaire. Rien à payer en ligne.
      </p>
      <ul class="space-y-3">
        {#each steps as step (step.title)}
          {@const Icon = step.icon}
          <li class="flex gap-3">
            <span class="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl"><Icon class="size-5" /></span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold">{step.title}</span>
              <span class="text-muted-foreground block text-sm">{step.text}</span>
            </span>
          </li>
        {/each}
      </ul>
      <Button size="lg" class="h-12 w-full" onclick={close}>C'est parti</Button>
    </div>
  </div>
{/if}
