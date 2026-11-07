<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Input } from '@nba/ui';

  interface Props {
    clubName: string;
    siteKey: string;
  }

  let { clubName, siteKey }: Props = $props();

  let step = $state<'email' | 'code'>('email');
  let email = $state('');
  let code = $state('');
  let error = $state('');
  let busy = $state(false);
  let widget = $state<HTMLElement>();
  let turnstileToken = '';

  onMount(() => {
    if (!siteKey) return;
    // Le script se charge à part : on attend qu'il soit là pour poser le widget invisible.
    const timer = setInterval(() => {
      const turnstile = (window as any).turnstile;
      if (!turnstile || !widget) return;
      clearInterval(timer);
      turnstile.render(widget, { sitekey: siteKey, appearance: 'interaction-only', callback: (t: string) => (turnstileToken = t) });
    }, 100);
    return () => clearInterval(timer);
  });

  async function post(path: string, body: unknown) {
    const res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Le serveur ne répond pas.');
  }

  async function submit(event: Event) {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      if (step === 'email') {
        await post('request-code', { email, turnstileToken });
        step = 'code';
      } else {
        await post('verify-code', { code });
        location.reload();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Une erreur est survenue.';
      (window as any).turnstile?.reset();
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="text-2xl font-semibold">Ma carte buvette</h1>
<p class="text-muted-foreground">
  {#if clubName}Payez à la buvette de {clubName} avec votre téléphone.{:else}Payez à la buvette avec votre téléphone.{/if}
  Votre adresse permet de retrouver votre carte et son solde si vous changez de téléphone.
</p>

{#if error}
  <p role="alert" class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
{/if}

<form class="space-y-3" onsubmit={submit}>
  {#if step === 'email'}
    <label class="block space-y-1">
      <span class="text-sm">Votre adresse e-mail</span>
      <Input type="email" autocomplete="email" required bind:value={email} placeholder="vous@exemple.fr" />
    </label>
    <div bind:this={widget}></div>
    <Button type="submit" class="w-full" disabled={busy}>Recevoir mon code</Button>
  {:else}
    <p class="text-sm">Un code a été envoyé à <strong>{email}</strong>.</p>
    <label class="block space-y-1">
      <span class="text-sm">Code à 6 chiffres</span>
      <Input inputmode="numeric" autocomplete="one-time-code" maxlength={6} required bind:value={code} />
    </label>
    <Button type="submit" class="w-full" disabled={busy}>Ouvrir ma carte</Button>
    <Button variant="ghost" class="w-full" onclick={() => { step = 'email'; code = ''; error = ''; }}>Changer d'adresse</Button>
  {/if}
</form>
