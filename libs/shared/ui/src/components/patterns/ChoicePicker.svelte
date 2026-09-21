<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { ChevronLeft, Check, Search } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';

  /**
   * L'écran de choix d'iOS : il entre par la droite, liste les options, et se
   * quitte par le chevron de retour.
   *
   * Les recommandations d'Apple ne connaissent pas le menu flottant ancré à un
   * bouton — c'est un idiome de bureau, où un curseur vise au pixel. Au doigt, un
   * choix est une **navigation** : un écran à part, des rangées de 44 points, une
   * coche sur ce qui est retenu, et la place d'expliquer ce qu'on attend.
   */
  let {
    open = $bindable(false),
    title,
    description,
    value = '',
    options,
    searchable = false,
    searchPlaceholder = 'Rechercher…',
    onChoose
  }: {
    open?: boolean;
    title: string;
    description?: string;
    value?: string;
    options: { value: string; label: string; hint?: string }[];
    searchable?: boolean;
    searchPlaceholder?: string;
    onChoose: (valeur: string) => void;
  } = $props();

  let recherche = $state('');

  const visibles = $derived.by(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return options;
    return options.filter((o) => o.label.toLowerCase().includes(terme));
  });

  // Rouvrir doit repartir de la liste entière : le filtre appartient à la visite.
  $effect(() => {
    if (!open) recherche = '';
  });

  function choisir(v: string) {
    onChoose(v);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-[60]" />
    <Dialog.Content
      class="bg-card text-card-foreground fixed inset-y-0 right-0 z-[60] flex w-full flex-col pt-[env(safe-area-inset-top,0px)] data-open:animate-in data-open:slide-in-from-right-full data-closed:animate-out data-closed:slide-out-to-right-full"
    >
      <div class="flex shrink-0 items-center gap-2 px-3 py-2">
        <Button
          variant="ghost"
          onclick={() => (open = false)}
          class="size-11 rounded-full p-0"
          aria-label="Retour"
        >
          <ChevronLeft class="size-6" />
        </Button>
        <Dialog.Title class="min-w-0 flex-1 truncate text-center text-base font-semibold">
          {title}
        </Dialog.Title>
        <span class="size-11 shrink-0"></span>
      </div>

      {#if description}
        <Dialog.Description class="shrink-0 px-6 pb-3 text-sm text-muted-foreground">
          {description}
        </Dialog.Description>
      {/if}

      {#if searchable}
        <!--
          Le rembourrage vit sur l'enveloppe, jamais sur la boîte de référence du
          positionnement : `top-1/2` se calculait sinon sur la hauteur du champ
          **plus** celle du `pb-3`, et la loupe tombait sous l'axe.
        -->
        <div class="shrink-0 px-4 pb-3">
          <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            bind:value={recherche}
            type="search"
            enterkeyhint="search"
            autocapitalize="off"
            spellcheck="false"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            class="border-input h-11 w-full rounded-full border bg-transparent pl-9 pr-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          </div>
        </div>
      {/if}

      <ul class="flex-1 divide-y divide-border overflow-y-auto overscroll-contain border-t border-border">
        {#each visibles as option (option.value)}
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
        {:else}
          <li class="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat.</li>
        {/each}
      </ul>

      <div class={cn('shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]')}></div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
