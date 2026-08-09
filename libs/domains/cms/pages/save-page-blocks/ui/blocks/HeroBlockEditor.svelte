<script lang="ts">
  import { Input, Label, Button } from '@nba/ui';
  import type { HeroBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: HeroBlock }>();

  // Quatre boutons au maximum : au-delà, ce n'est plus une accroche.
  const MAX = 4;

  function add() {
    if (block.ctas.length >= MAX) return;
    block.ctas = [...block.ctas, { label: '', href: '', variant: 'primary' }];
  }
  function remove(index: number) {
    block.ctas = block.ctas.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-3">
  <div>
    <Label for="hero-title">Titre</Label>
    <Input id="hero-title" bind:value={block.title} />
  </div>
  <div>
    <Label for="hero-subtitle">Sous-titre</Label>
    <Input id="hero-subtitle" bind:value={block.subtitle} />
  </div>

  <div class="space-y-2">
    <Label>Boutons</Label>
    {#each block.ctas as cta, index (index)}
      <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input bind:value={cta.label} placeholder="Libellé" />
        <Input bind:value={cta.href} placeholder="/creneaux/ ou https://…" />
        <Button variant="ghost" onclick={() => remove(index)}>Retirer</Button>
      </div>
    {/each}
    {#if block.ctas.length < MAX}
      <Button variant="secondary" onclick={add}>Ajouter un bouton</Button>
    {/if}
  </div>
</div>
