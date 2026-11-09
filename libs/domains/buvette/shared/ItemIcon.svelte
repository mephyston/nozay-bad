<script lang="ts">
  import {
    Apple, Beer, CakeSlice, Candy, Coffee, CookingPot, Cookie, Croissant, CupSoda, GlassWater, Hamburger,
    IceCreamCone, Pizza, Popcorn, Salad, Sandwich, Wine, Zap
  } from '@lucide/svelte';
  import { resolveItemIcon, type ItemIconKey } from './item-icons';

  /** Le pictogramme d'un article, ou son initiale quand rien ne le reconnaît. */
  let { name, icon = null, class: className = '' }: { name: string; icon?: string | null; class?: string } = $props();

  const COMPONENTS: Record<ItemIconKey, typeof Coffee> = {
    coffee: Coffee, soda: CupSoda, water: GlassWater, energy: Zap, beer: Beer, wine: Wine,
    burger: Hamburger, sandwich: Sandwich, pizza: Pizza, pasta: CookingPot, salad: Salad,
    croissant: Croissant, cake: CakeSlice, cookie: Cookie, candy: Candy, icecream: IceCreamCone,
    fruit: Apple, snack: Popcorn
  };

  const key = $derived(resolveItemIcon(name, icon));
  const Component = $derived(key ? COMPONENTS[key] : null);
</script>

{#if Component}
  <Component class={className} aria-hidden="true" />
{:else}
  <span class={`flex items-center justify-center font-semibold uppercase ${className}`} aria-hidden="true">{name.trim().charAt(0)}</span>
{/if}
