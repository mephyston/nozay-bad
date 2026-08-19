<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Save } from '@lucide/svelte';
  import * as Sheet from '../ui/sheet';
  import { Button } from '../ui/button';
  import ErrorAlert from './ErrorAlert.svelte';
  import type { SheetSize } from '../ui/sheet/sheet-content.svelte';

  /**
   * Coquille commune aux formulaires de création / modification de l'admin.
   *
   * Chaque écran réécrivait la même structure à la main — `Sheet.Root` lié à un booléen,
   * `Sheet.Content size="md" class="overflow-y-auto"`, un en-tête titre + description, une
   * `<Alert>` d'erreur au-dessus des champs, et un pied avec le bouton de soumission dont
   * le libellé bascule pendant l'envoi. Les écrans du CMS, eux, ne l'ont pas réécrite du
   * tout : leur formulaire restait posé en haut de la page, avec des `<Label>` collés aux
   * `<Input>` faute de `FormField`.
   *
   * Le composant fixe cette structure une bonne fois. Les champs sont fournis en
   * `children` — chacun dans un {@link FormField} pour l'espacement du libellé — et
   * l'écran garde la main sur la soumission via {@link submitForm}, dont le `close`
   * bascule le `open` lié ici.
   */
  let {
    open = $bindable(false),
    title,
    description,
    icon: Icon,
    error = null,
    isSubmitting = false,
    submitLabel = 'Enregistrer',
    submittingLabel = 'Enregistrement…',
    cancelLabel = 'Annuler',
    size = 'md',
    onSubmit,
    submitIcon,
    children,
    footer
  }: {
    open: boolean;
    title: string;
    description?: string;
    icon?: any;
    /** Message de refus, affiché dans le formulaire : le sheet couvre la page et masquerait un toast. */
    error?: string | null;
    isSubmitting?: boolean;
    submitLabel?: string;
    submittingLabel?: string;
    cancelLabel?: string;
    size?: SheetSize;
    onSubmit: (event: Event) => void;
    /** Icône du bouton de soumission ; `Save` par défaut. */
    submitIcon?: Snippet;
    children: Snippet;
    /** Remplace les boutons par défaut lorsqu'un écran a besoin d'actions supplémentaires. */
    footer?: Snippet;
  } = $props();
</script>

<Sheet.Root bind:open>
  <Sheet.Content {size} class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        {#if Icon}
          <Icon class="h-5 w-5 text-primary" />
        {/if}
        {title}
      </Sheet.Title>
      {#if description}
        <Sheet.Description>{description}</Sheet.Description>
      {/if}
    </Sheet.Header>

    <div class="space-y-4 pt-2">
      {#if error}
        <ErrorAlert message={error} />
      {/if}

      <form onsubmit={onSubmit} class="space-y-4">
        {@render children()}

        {#if footer}
          {@render footer()}
        {:else}
          <div class="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onclick={() => (open = false)}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting} class="gap-1.5">
              {#if submitIcon}
                {@render submitIcon()}
              {:else}
                <Save class="h-4 w-4" />
              {/if}
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        {/if}
      </form>
    </div>
  </Sheet.Content>
</Sheet.Root>
