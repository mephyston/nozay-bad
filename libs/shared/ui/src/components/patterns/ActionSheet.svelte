<script lang="ts" generics="T">
  import { Dialog } from 'bits-ui';
  import { cn } from '../../lib/utils.js';
  import { runAction } from '../../lib/actions/run-action.js';
  import type { SwipeAction } from './list/list-types.js';

  /**
   * La feuille d'actions d'iOS.
   *
   * Un menu flottant ancré à un bouton est un idiome de bureau : il suppose un
   * curseur qui vise au pixel et se pose là où il y a de la place — souvent en haut
   * de l'écran, hors de portée du pouce. Les recommandations d'Apple lui préfèrent,
   * sur téléphone, une feuille montant du bas : pleine largeur, rangées de 44
   * points, action destructrice en rouge, et « Annuler » détaché en dessous pour
   * qu'on ne le confonde pas avec un choix.
   */
  let {
    open = $bindable(false),
    actions,
    item,
    title,
    cancelLabel = 'Annuler'
  }: {
    open?: boolean;
    actions: SwipeAction<T>[];
    item: T;
    /** Ce sur quoi portent les actions ; l'en-tête d'une feuille d'actions iOS. */
    title?: string;
    cancelLabel?: string;
  } = $props();

  async function lancer(action: SwipeAction<T>) {
    open = false;
    await runAction(action, item);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[60] bg-black/30" />
    <Dialog.Content
      class="fixed inset-x-0 bottom-0 z-[60] flex flex-col gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] data-open:animate-in data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:slide-out-to-bottom-full"
    >
      <div class="overflow-hidden rounded-2xl bg-card">
        {#if title}
          <Dialog.Title class="block px-4 py-3 text-center text-xs text-muted-foreground">
            {title}
          </Dialog.Title>
        {:else}
          <Dialog.Title class="sr-only">Actions</Dialog.Title>
        {/if}
        <ul class="divide-y divide-border {title ? 'border-t border-border' : ''}">
          {#each actions as action (action.id)}
            {@const Icone = action.icon}
            <li>
              <button
                type="button"
                onclick={() => lancer(action)}
                class={cn(
                  'flex min-h-[3.25rem] w-full items-center justify-center gap-2 px-4 text-base',
                  action.tone === 'destructive' ? 'text-destructive' : 'text-foreground'
                )}
              >
                {#if Icone}<Icone class="size-5" aria-hidden="true" />{/if}
                {action.label}
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Détaché : « Annuler » n'est pas un choix parmi les autres. -->
      <button
        type="button"
        onclick={() => (open = false)}
        class="flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl bg-card text-base font-semibold"
      >
        {cancelLabel}
      </button>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
