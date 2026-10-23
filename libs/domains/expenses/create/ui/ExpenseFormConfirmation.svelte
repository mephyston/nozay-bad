<script lang="ts">
  import { CheckCircle, Plus } from '@lucide/svelte';
  import { Button } from '@nba/ui';

  /**
   * L'accusé de réception d'une note de frais.
   *
   * Il remplace le formulaire : un message posé au-dessus restait hors de l'écran, le
   * bouton d'envoi étant tout en bas, et l'adhérent ne savait pas si sa note était partie.
   */
  let {
    message,
    montant,
    motif,
    onNouvelle
  }: {
    message: string;
    montant: string;
    motif: string;
    onNouvelle: () => void;
  } = $props();

  let racine = $state<HTMLElement | null>(null);
  $effect(() => {
    racine?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    racine?.focus();
  });
</script>

<div bind:this={racine} tabindex="-1" role="status" class="flex flex-col items-center gap-3 py-6 text-center outline-none">
  <CheckCircle class="h-14 w-14 text-primary" />
  <p class="text-base font-semibold text-foreground">Note de frais envoyée</p>
  <p class="text-sm text-foreground">
    <span class="font-semibold tabular-nums">{montant}</span>{#if motif} · {motif}{/if}
  </p>
  <p class="max-w-md text-sm text-muted-foreground">{message}</p>
  <Button variant="outline" onclick={onNouvelle} class="mt-2 gap-2">
    <Plus class="h-4 w-4" />
    Saisir une autre note de frais
  </Button>
</div>
