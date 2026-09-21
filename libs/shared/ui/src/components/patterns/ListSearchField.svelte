<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';

  /**
   * Le champ de recherche d'une liste.
   *
   * Rendu **sous** le grand titre, dans le conteneur défilant, et il défile avec
   * lui : c'est la disposition iOS. Une barre de recherche collante est
   * l'exception — Mail — et non la règle.
   */
  let {
    value = $bindable(''),
    placeholder = 'Rechercher',
    onSubmit,
    debounce = 250,
    class: className
  }: {
    value?: string;
    placeholder?: string;
    /**
     * Appelée après la temporisation, et immédiatement à la validation. Absente,
     * le champ se contente de tenir sa valeur liée.
     */
    onSubmit?: (valeur: string) => void;
    /**
     * Temporisation avant appel de `onSubmit` pendant la frappe. À **0**, la
     * frappe n'appelle rien : seules la validation et l'effacement déclenchent.
     * C'est ce qu'il faut quand chaque appel part au serveur — une recherche
     * relancée à chaque lettre, ce sont autant de requêtes pour une seule question.
     */
    debounce?: number;
    class?: string;
  } = $props();

  let champ = $state<HTMLInputElement | null>(null);
  let minuteur: ReturnType<typeof setTimeout> | undefined;

  function differer(valeur: string) {
    if (!onSubmit || debounce <= 0) return;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => onSubmit(valeur), debounce);
  }

  function valider(e: Event) {
    e.preventDefault();
    clearTimeout(minuteur);
    onSubmit?.(value);
    // Referme le clavier logiciel : la liste est sous lui.
    champ?.blur();
  }

  function effacer() {
    value = '';
    clearTimeout(minuteur);
    onSubmit?.('');
    champ?.focus();
  }

  $effect(() => () => clearTimeout(minuteur));
</script>

<form role="search" onsubmit={valider} class={cn('relative', className)}>
  <Search
    class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    aria-hidden="true"
  />
  <!--
    `text-base` sous `sm` : à 14 px, la saisie est pénible au pouce, et le zoom
    automatique d'iOS qui compenserait d'habitude est neutralisé par le
    `user-scalable=no` du layout.
  -->
  <input
    bind:this={champ}
    bind:value
    oninput={() => differer(value)}
    type="search"
    enterkeyhint="search"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    aria-label={placeholder}
    {placeholder}
    class="h-11 w-full rounded-full border border-border bg-card pl-9 pr-10 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:text-sm"
  />
  {#if value}
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onclick={effacer}
      class="absolute right-1.5 top-1/2 -translate-y-1/2"
    >
      <X class="size-4" />
      <span class="sr-only">Effacer la recherche</span>
    </Button>
  {/if}
</form>

<style>
  /* Le navigateur pose sa propre croix sur un `type="search"` ; la nôtre suffit. */
  input::-webkit-search-cancel-button {
    appearance: none;
  }
</style>
