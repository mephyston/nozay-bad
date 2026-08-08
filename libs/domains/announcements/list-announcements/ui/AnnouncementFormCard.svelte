<script lang="ts">
  import { Button, Input, FormField, Alert, Checkbox, Select, RichTextEditor } from '@nba/ui';
  import { AlertCircle, Save, Send } from '@lucide/svelte';

  let {
    editingId,
    title = $bindable(''),
    bodyHtml = $bindable(''),
    status = $bindable<'draft' | 'published'>('draft'),
    notify = $bindable(false),
    alreadyNotified = false,
    canNotify = false,
    isSubmitting,
    errorMsg,
    onSubmit
  }: {
    editingId: number | null;
    title: string;
    bodyHtml: string;
    status: 'draft' | 'published';
    notify: boolean;
    alreadyNotified?: boolean;
    canNotify?: boolean;
    isSubmitting: boolean;
    errorMsg: string;
    onSubmit: (e: Event) => void;
  } = $props();

  /**
   * La case reste **visible** dès que le compte peut diffuser et que l'annonce n'a pas
   * déjà été envoyée : la masquer tant que le statut est « brouillon » la rendait
   * introuvable, puisqu'on ne la découvrait qu'après avoir changé le statut.
   * Elle n'est qu'inactive, avec la raison affichée.
   */
  const notifyVisible = $derived(canNotify && !alreadyNotified);
  const notifyEnabled = $derived(notifyVisible && status === 'published');

  // Aperçu de ce que recevront les adhérents : titre + début du texte, sans balisage.
  const pushPreview = $derived(
    bodyHtml
      .replace(/<\/(p|li|ul|ol)\s*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
  );
</script>

<div class="space-y-4 pt-2">
  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4 shrink-0" />
      <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <form onsubmit={onSubmit} class="space-y-4">
    <FormField id="announcement-title" label="Titre">
      <Input
        type="text"
        id="announcement-title"
        placeholder="Ex : Tournoi interne du 12 septembre"
        bind:value={title}
        maxlength={200}
        required
      />
    </FormField>

    <FormField id="announcement-body" label="Texte">
      <RichTextEditor
        id="announcement-body"
        bind:value={bodyHtml}
        placeholder="Rédigez votre annonce…"
        disabled={isSubmitting}
      />
    </FormField>

    <FormField id="announcement-status" label="Statut">
      <Select id="announcement-status" bind:value={status}>
        <option value="draft">Brouillon — visible de la seule administration</option>
        <option value="published">Publiée — visible dans l'espace adhérent</option>
      </Select>
    </FormField>

    {#if notifyVisible}
      <div class="rounded-md border border-border bg-muted/40 px-3 py-2.5">
        <div class="flex items-start gap-2.5">
          <Checkbox
            id="announcement-notify"
            bind:checked={notify}
            disabled={!notifyEnabled}
            class="mt-0.5"
          />
          <label
            for="announcement-notify"
            class={`text-sm ${notifyEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
          >
            <span class="block font-medium text-foreground">Prévenir les adhérents</span>
            <span class="block text-xs text-muted-foreground">
              {#if notifyEnabled}
                Envoie une notification à tous les adhérents abonnés, avec le titre et le début du texte.
                Une annonce n'est diffusée qu'une seule fois.
              {:else}
                Passez le statut à « Publiée » pour pouvoir prévenir les adhérents.
              {/if}
            </span>
          </label>
        </div>

        {#if notifyEnabled && notify && pushPreview}
          <div class="mt-2.5 rounded-md border border-border bg-background px-3 py-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Aperçu de la notification
            </p>
            <p class="mt-1 text-sm font-semibold text-foreground">{title || 'Titre de l\'annonce'}</p>
            <p class="text-xs text-muted-foreground">{pushPreview}…</p>
          </div>
        {/if}
      </div>
    {:else if alreadyNotified}
      <p class="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        Cette annonce a déjà été diffusée aux adhérents. Les modifications ne déclenchent pas de nouvel envoi.
      </p>
    {/if}

    <div class="flex justify-end gap-2 pt-2">
      <Button type="submit" disabled={isSubmitting} class="gap-1.5">
        {#if notifyEnabled && notify}
          <Send class="w-4 h-4" />
        {:else}
          <Save class="w-4 h-4" />
        {/if}
        {isSubmitting ? 'Enregistrement…' : editingId ? 'Enregistrer' : "Créer l'annonce"}
      </Button>
    </div>
  </form>
</div>
