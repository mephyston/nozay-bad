<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleCheck, CircleX } from '@lucide/svelte';
  import * as AlertDialog from '../ui/alert-dialog';
  import { softNavigate } from '../../lib/navigation';

  /*
    Le verdict d'un import, posé devant l'écran.

    Un import — adhérents Poona, classements, relevé bancaire — se terminait par une alerte
    inline ou un toast, puis l'écran restait sur le formulaire de dépôt : rien n'invitait à
    aller voir le résultat, et le toast avait disparu avant qu'on l'ait lu. Ce dialogue dit
    si l'import a réussi, résume ce qu'il a fait, et son bouton mène **là où le résultat se
    lit** : la liste des adhérents, les classements, le rapprochement. En échec, il se ferme
    et laisse le formulaire en place pour réessayer.
  */
  let {
    open = $bindable(false),
    success,
    title,
    message,
    continueHref,
    continueLabel = 'Continuer',
    children
  }: {
    open?: boolean;
    success: boolean;
    title: string;
    /** Résumé en une phrase ; les détails passent par `children`. */
    message?: string;
    /** Où mène « Continuer » en cas de succès. Sans lien, le bouton ferme seulement. */
    continueHref?: string;
    continueLabel?: string;
    children?: Snippet;
  } = $props();

  function onContinue() {
    open = false;
    if (success && continueHref) softNavigate(continueHref);
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content data-import-result={success ? 'success' : 'failure'}>
    <AlertDialog.Header>
      <AlertDialog.Title class="flex items-center gap-2">
        {#if success}
          <CircleCheck class="w-5 h-5 text-success" />
        {:else}
          <CircleX class="w-5 h-5 text-destructive" />
        {/if}
        {title}
      </AlertDialog.Title>
      {#if message}
        <AlertDialog.Description>{message}</AlertDialog.Description>
      {/if}
    </AlertDialog.Header>
    {#if children}
      <div class="text-sm">{@render children()}</div>
    {/if}
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={onContinue}>
        {success ? continueLabel : 'OK'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
