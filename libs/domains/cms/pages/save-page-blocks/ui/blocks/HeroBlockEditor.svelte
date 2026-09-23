<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';
  import { Button, FormField, Input } from '@nba/ui';
  import type { HeroBlock } from '../../../../shared/blocks';
  import LinkTargetField from './LinkTargetField.svelte';

  let { block = $bindable(), targets = [] } = $props<{
    block: HeroBlock;
    /** Pages et actualités du site, proposées à la cible d'un bouton. */
    targets?: { path: string; title: string; kind?: string; status?: string }[];
  }>();

  // Quatre boutons au maximum : au-delà, ce n'est plus une accroche.
  const MAX = 4;

  function add() {
    if (block.ctas.length >= MAX) return;
    block.ctas = [...block.ctas, { label: '', href: '', variant: 'primary' }];
  }
  function remove(index: number) {
    block.ctas = block.ctas.filter((_: unknown, i: number) => i !== index);
  }
</script>

<div class="space-y-4">
  <FormField id="hero-title" label="Titre">
    <Input id="hero-title" bind:value={block.title} />
  </FormField>

  <FormField id="hero-subtitle" label="Sous-titre">
    <Input id="hero-subtitle" bind:value={block.subtitle} />
  </FormField>

  <!--
    Chaque bouton est une petite carte : ses trois champs portaient jusqu'ici leur
    seul placeholder, et l'adresse se saisissait à la main — sans le choix de nature
    ni la recherche de page qu'ont les deux autres blocs à boutons.
  -->
  <div class="space-y-3">
    <h4 class="text-sm font-medium">Boutons</h4>

    {#each block.ctas as cta, index (index)}
      <div class="space-y-3 rounded-md border border-border p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Bouton {index + 1}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onclick={() => remove(index)}>
            <Trash2 class="size-4" />
            <span class="sr-only">Retirer le bouton {index + 1}</span>
          </Button>
        </div>

        <FormField id={`hero-cta-${index}-label`} label="Libellé">
          <Input id={`hero-cta-${index}-label`} bind:value={cta.label} placeholder="Nous rejoindre" />
        </FormField>

        <LinkTargetField id={`hero-cta-${index}-target`} bind:href={cta.href} {targets} />
      </div>
    {/each}

    {#if block.ctas.length < MAX}
      <Button type="button" variant="outline" class="w-full gap-1.5" onclick={add}>
        <Plus class="size-4" />
        Ajouter un bouton
      </Button>
    {/if}
  </div>
</div>
