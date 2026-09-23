<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Save, Check, X, Loader2 } from '@lucide/svelte';
  import ResponsiveSheet from './ResponsiveSheet.svelte';
  import { Button } from '../ui/button';
  import ErrorAlert from './ErrorAlert.svelte';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
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
    namedActions = false,
    lectureSeule = false,
    onOpenChange,
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
    /** Icône du bouton de soumission : le rond de la barre haute et le bouton du pied. `Check` / `Save` à défaut. */
    submitIcon?: Snippet;
    /**
     * Garde des boutons nommés sur téléphone, au lieu des deux cercles.
     *
     * À poser sur une soumission **irréversible** : nommer l'acte est le dernier
     * garde-fou avant de l'accomplir, et un rond ne le nomme pas. Même raison qui
     * réserve le rouge aux actions sans retour dans `uiConfirm`.
     */
    namedActions?: boolean;
    /**
     * Rien à soumettre : la feuille se consulte, elle ne s'enregistre pas.
     *
     * Pour les panneaux qu'un compte sans droit d'écriture ouvre quand même — l'effectif
     * d'une équipe, son calendrier. Un bouton de validation désactivé y serait une
     * promesse qu'on ne tient pas ; il n'y en a simplement pas, et la croix devient la
     * seule sortie.
     */
    lectureSeule?: boolean;
    /**
     * Prévenu de chaque ouverture et fermeture, celles que la feuille décide comprises.
     * Nécessaire dès que l'ouverture reflète un état extérieur — la note qu'on modifie,
     * par exemple : sans elle, il faudrait un miroir et deux effets qui se répondent.
     */
    onOpenChange?: (open: boolean) => void;
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

  const requete = creerIsMobile();
  /**
   * Deux cercles sur téléphone, **en haut de la feuille** et non en pied.
   *
   * Une feuille est ancrée au bas de l'écran : quand le clavier logiciel s'ouvre,
   * réduire sa hauteur ne remonte pas son pied, que le clavier recouvre alors
   * entièrement — les boutons devenaient inatteignables dès qu'on saisissait. Une
   * modale iOS met pour cette raison ses actions dans sa barre de navigation.
   *
   * Le check porte la couleur d'accent et **non du vert** : ici le vert est
   * `success`, un état — « c'est fait » —, et l'employer pour « valider » le
   * rendrait muet là où il sert vraiment.
   */
  const cercles = $derived(requete.current && !namedActions);
</script>

<ResponsiveSheet bind:open {title} icon={Icon} {description} {size} footerHidden={cercles} {onOpenChange}>
  {#snippet headerLeading()}
    {#if cercles}
      <Button
        type="button"
        variant="ghost"
        disabled={isSubmitting}
        onclick={() => (open = false)}
        class="glass-surface size-11 rounded-full p-0"
        style="--glass-base: var(--card)"
        aria-label={cancelLabel}
      >
        <X class="size-5" />
      </Button>
    {/if}
  {/snippet}

  {#snippet headerTrailing()}
    {#if cercles && !lectureSeule}
      <Button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        class="size-11 rounded-full p-0"
        aria-label={isSubmitting ? submittingLabel : submitLabel}
      >
        {#if isSubmitting}
          <Loader2 class="size-5 animate-spin" />
        {:else if submitIcon}
          <!--
            L'acte n'est pas toujours « enregistrer ». Diffuser une notification part
            vers les téléphones du club et ne se rappelle pas : le rond doit porter
            l'avion en papier, et non la coche qui range un formulaire.
          -->
          {@render submitIcon()}
        {:else}
          <Check class="size-5" />
        {/if}
      </Button>
    {/if}
  {/snippet}

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
        {#if !lectureSeule}
        <Button type="submit" form={formId} disabled={isSubmitting} class="w-full gap-1.5 sm:w-auto">
          {#if submitIcon}
            {@render submitIcon()}
          {:else}
            <Save class="h-4 w-4" />
          {/if}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {/if}
      </div>
    {/if}
  {/snippet}
</ResponsiveSheet>
