<script lang="ts">
  import { User } from '@lucide/svelte';
  import { cn } from '../../lib/utils.js';

  /**
   * Le portrait d'un adhérent, là où on le cite.
   *
   * Purement présentatif : il reçoit une adresse déjà construite et n'en sait pas plus.
   * C'est voulu — les portraits vivent dans un préfixe R2 privé, et chaque application
   * les relaie par une route qui lui est propre (`/admin/api/member-photo` pour
   * l'administration, `/api/adherents/photo/…` pour l'espace adhérent). Un composant qui
   * fabriquerait l'URL lui-même devrait connaître les deux, et se tromperait un jour.
   *
   * **Sans `Avatar` de bits-ui, délibérément.** Cette primitive choisit entre l'image et
   * le repli depuis le navigateur, ce qui suppose un îlot hydraté. Or l'effectif d'une
   * équipe est rendu par une page Astro : un avatar par joueur y coûterait autant
   * d'îlots pour une image et une silhouette. Écrit ainsi, le composant rend le même
   * balisage des deux côtés, hydraté ou non.
   */
  let {
    /** Adresse du portrait, ou `null` si l'adhérent n'en a pas. */
    src = null,
    /** Nom de l'adhérent : alternative textuelle de l'image. */
    name = '',
    size = 'default',
    class: className = ''
  } = $props<{
    src?: string | null;
    name?: string;
    size?: 'sm' | 'default' | 'lg';
    class?: string;
  }>();

  const SIZES = { sm: 'size-6', default: 'size-8', lg: 'size-10' } as const;
</script>

<span
  class={cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary',
    SIZES[size as keyof typeof SIZES] ?? SIZES.default,
    className
  )}
>
  {#if src}
    <!-- `loading="lazy"` : une liste d'adhérents en aligne deux cents, dont une poignée
         seulement est à l'écran. -->
    <img {src} alt={name} loading="lazy" decoding="async" class="size-full object-cover" />
  {:else}
    <User class="size-1/2" aria-hidden="true" />
  {/if}
</span>
