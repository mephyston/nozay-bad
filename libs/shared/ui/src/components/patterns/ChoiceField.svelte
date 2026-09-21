<script lang="ts">
  import { getContext } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { ChevronRight, ChevronLeft, Check } from '@lucide/svelte';
  import { Select } from '../ui/select/index.js';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';

  /**
   * Un choix parmi plusieurs.
   *
   * Sur ordinateur, la liste déroulante native : rien ne la bat à la souris.
   *
   * Sur téléphone, la disposition iOS : une ligne qui porte l'intitulé à gauche, la
   * valeur choisie à droite et un chevron, puis un écran qui entre par la droite
   * avec toutes les options — et la place d'expliquer ce qu'on attend, ce qu'une
   * liste déroulante ne permet jamais. On en revient par le chevron de retour.
   */
  let {
    label,
    id,
    value = $bindable(''),
    options,
    placeholder = 'Choisir…',
    description,
    disabled = false
  }: {
    label: string;
    id: string;
    value?: string;
    /** `hint` s'affiche sous l'option, dans l'écran de choix. */
    options: { value: string; label: string; hint?: string }[];
    placeholder?: string;
    /** Ce qu'on attend, affiché en tête de l'écran de choix. */
    description?: string;
    disabled?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);

  // La ligne porte l'intitulé : le bloc n'a plus à l'afficher au-dessus.
  $effect(() => {
    if (requete.current && champ) champ.absorberLabel();
  });

  let ouvert = $state(false);
  const choisi = $derived(options.find((o) => o.value === value));

  function choisir(v: string) {
    value = v;
    ouvert = false;
  }
</script>

{#if requete.current}
  <button
    type="button"
    {id}
    {disabled}
    onclick={() => (ouvert = true)}
    class="border-input flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50"
  >
    <span class="shrink-0 text-muted-foreground">{label}</span>
    <span class="flex min-w-0 items-center gap-1">
      <span class={cn('truncate', !choisi && 'text-muted-foreground')}>
        {choisi?.label ?? placeholder}
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </span>
  </button>

  <Dialog.Root bind:open={ouvert}>
    <Dialog.Portal>
      <Dialog.Overlay class="bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-[60]" />
      <!--
        Entre par la droite et en sort de même : c'est une navigation, pas une
        feuille. Le geste de retour est le chevron, à la place exacte où iOS le met.
      -->
      <Dialog.Content
        class="bg-card text-card-foreground fixed inset-y-0 right-0 z-[60] flex w-full flex-col pt-[env(safe-area-inset-top,0px)] data-open:animate-in data-open:slide-in-from-right-full data-closed:animate-out data-closed:slide-out-to-right-full"
      >
        <div class="flex shrink-0 items-center gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onclick={() => (ouvert = false)}
            class="size-11 rounded-full p-0"
            aria-label="Retour"
          >
            <ChevronLeft class="size-6" />
          </Button>
          <Dialog.Title class="min-w-0 flex-1 truncate text-center text-base font-semibold">
            {label}
          </Dialog.Title>
          <span class="size-11 shrink-0"></span>
        </div>

        {#if description}
          <Dialog.Description class="shrink-0 px-6 pb-3 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>
        {/if}

        <ul class="flex-1 divide-y divide-border overflow-y-auto overscroll-contain border-y border-border">
          {#each options as option (option.value)}
            <li>
              <button
                type="button"
                onclick={() => choisir(option.value)}
                class="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{option.label}</span>
                  {#if option.hint}
                    <span class="mt-0.5 block truncate text-xs text-muted-foreground">{option.hint}</span>
                  {/if}
                </span>
                {#if option.value === value}
                  <Check class="size-5 shrink-0 text-primary" aria-label="Choisi" />
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{:else}
  <Select {id} bind:value {disabled}>
    <option value="">{placeholder}</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </Select>
{/if}
