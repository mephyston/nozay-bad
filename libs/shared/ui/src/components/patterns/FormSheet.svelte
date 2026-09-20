<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Save } from '@lucide/svelte';
  import ResponsiveSheet from './ResponsiveSheet.svelte';
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
   *
   * Depuis le passage à {@link ResponsiveSheet}, la coquille monte du bas et glisse
   * entre ses paliers sur téléphone, et reste un panneau latéral au-dessus de 768 px.
   * Le pied est collé en bas : sur une feuille à mi-hauteur, des boutons posés dans
   * le flux passent sous le pli. Il vit donc hors du `<form>`, et ses boutons de
   * soumission le rejoignent par l'attribut `form` — d'où l'identifiant passé au
   * snippet `footer` pour les écrans qui fournissent leurs propres actions.
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
    footer: footerSnippet
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
    /**
     * Remplace les boutons par défaut lorsqu'un écran a besoin d'actions
     * supplémentaires. Reçoit l'identifiant du `<form>` : tout bouton de
     * soumission doit porter `form={id}`, le pied étant hors du formulaire.
     */
    footer?: Snippet<[string]>;
  } = $props();

  // Le pied vit hors du `<form>` : les boutons l'y rattachent par leur attribut `form`.
  const formId = $props.id();
</script>

<ResponsiveSheet bind:open {title} icon={Icon} {description} {size}>
  <div class="space-y-4 pt-2">
    {#if error}
      <ErrorAlert message={error} />
    {/if}

    <form id={formId} onsubmit={onSubmit} class="space-y-4">
      {@render children()}
    </form>
  </div>

  {#snippet footer()}
    {#if footerSnippet}
      {@render footerSnippet(formId)}
    {:else}
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onclick={() => (open = false)}
          class="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting} class="w-full gap-1.5 sm:w-auto">
          {#if submitIcon}
            {@render submitIcon()}
          {:else}
            <Save class="h-4 w-4" />
          {/if}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    {/if}
  {/snippet}
</ResponsiveSheet>
