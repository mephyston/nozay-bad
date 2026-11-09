<script lang="ts">
  import { Button } from '@nba/ui';
  import { euros } from '../lib/format';

  let { email, balanceCents }: { email: string; balanceCents: number } = $props();

  let notice = $state('');
  let confirmDelete = $state(false);

  async function revoke() {
    const res = await fetch('/api/revoke-devices', { method: 'POST' });
    notice = res.ok ? 'Les autres appareils sont déconnectés. Le solde ne change pas.' : "Cette action n'a pas abouti. Réessayez.";
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/connexion';
  }

  async function deleteCard() {
    const res = await fetch('/api/delete-card', { method: 'POST' });
    if (res.ok) location.href = '/connexion';
    else notice = "La carte n'a pas pu être supprimée : il reste peut-être un solde.";
  }
</script>

<h1 class="text-lg font-semibold">Compte</h1>

<section class="bg-card space-y-1 rounded-2xl border p-4 text-sm">
  <p class="text-muted-foreground">Carte rattachée à</p>
  <p class="font-semibold break-all">{email}</p>
  <p class="text-muted-foreground pt-2">Cette adresse permet de retrouver votre carte et son solde sur un autre téléphone.</p>
</section>

{#if balanceCents > 0}
  <p class="text-muted-foreground text-sm">Pour récupérer vos {euros(balanceCents)}, demandez un remboursement en espèces à la buvette.</p>
{/if}

{#if notice}
  <p role="status" class="bg-muted rounded-xl p-3 text-sm">{notice}</p>
{/if}

<div class="space-y-2">
  <Button variant="outline" class="w-full" onclick={revoke}>Déconnecter les autres appareils</Button>
  <Button variant="outline" class="w-full" onclick={logout}>Fermer sur cet appareil</Button>
  {#if balanceCents === 0}
    {#if confirmDelete}
      <p class="text-sm">Votre adresse sera effacée. Cette action est définitive.</p>
      <Button variant="destructive" class="w-full" onclick={deleteCard}>Supprimer définitivement</Button>
      <Button variant="ghost" class="w-full" onclick={() => (confirmDelete = false)}>Garder ma carte</Button>
    {:else}
      <Button variant="ghost" class="w-full" onclick={() => (confirmDelete = true)}>Supprimer ma carte</Button>
    {/if}
  {/if}
</div>

<a href="/?guide" class="text-primary block text-center text-sm font-semibold hover:underline">Revoir le guide de la carte</a>

<p class="text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
  <a href="/mentions-legales" class="hover:underline">Mentions légales</a>
  <a href="/confidentialite" class="hover:underline">Confidentialité</a>
  <a href="/conditions" class="hover:underline">Conditions d'utilisation</a>
</p>
