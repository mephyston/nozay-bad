<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Avatar, Button, ErrorAlert } from '@nba/ui';
  import { Camera, Trash2 } from '@lucide/svelte';
  import { preparePhoto } from './member-photo-prepare';

  let {
    /**
     * Adresse de lecture du portrait — l'hôte la fait pointer vers son propre relais
     * authentifié (`/api/adherents/photo/…` ou `/admin/api/member-photo?licence=…`).
     * Elle peut déjà porter des paramètres : voir `photoUrl()`.
     */
    baseSrc,
    /** Où poster le dépôt et le retrait. Chaîne vide : la page courante elle-même. */
    endpoint = '',
    /** `photoUpdatedAt` de l'adhérent, ou `null` s'il n'a pas de photo. */
    version = null,
    initials,
    canEdit = false,
    /** Côté de la pastille, en pixels de mise en page. */
    size = 96,
    /**
     * Identité affichée à hauteur de la pastille — nom, licence, catégorie.
     *
     * Confiée au composant plutôt que posée à côté de lui : c'est lui qui sait ce qui doit
     * rester sur la ligne de la pastille et ce qui passe en dessous.
     */
    identity
  }: {
    baseSrc: string;
    endpoint?: string;
    version?: number | null;
    initials: string;
    canEdit?: boolean;
    size?: number;
    identity?: Snippet;
  } = $props();

  let currentVersion = $state<number | null>(version);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let confirmingRemoval = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  /**
   * Ajoute les paramètres à `baseSrc`, qui en porte peut-être déjà.
   *
   * Le séparateur ne peut pas être écrit en dur : le relais de l'espace adhérent désigne
   * l'adhérent par le chemin (`/api/adherents/photo/06123456`) tandis que celui de
   * l'administration le passe en paramètre (`/admin/api/member-photo?licence=…`). Un `?`
   * systématique produisait `…?licence=06123456?size=512` — la licence lue à l'autre bout
   * n'existait pas, et la fiche de l'administration n'affichait jamais la photo.
   */
  function photoUrl(base: string, params: Record<string, string>): string {
    const query = new URLSearchParams(params).toString();
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  }

  // La version fait office d'adresse : un portrait remplacé change d'URL, ce qui suffit
  // à écarter le cache du navigateur sans rien avoir à invalider.
  const src = $derived(
    currentVersion ? photoUrl(baseSrc, { size: '512', v: String(currentVersion) }) : null
  );

  async function send(form: FormData): Promise<void> {
    busy = true;
    error = null;
    try {
      const response = await fetch(endpoint, { method: 'POST', body: form });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { photoUpdatedAt?: number | null };
      };
      if (!response.ok || !payload.success) {
        error = payload.error ?? "La photo n'a pas pu être enregistrée.";
        return;
      }
      currentVersion = payload.data?.photoUpdatedAt ?? null;
    } catch {
      error = 'Envoi impossible. Vérifiez votre connexion et réessayez.';
    } finally {
      busy = false;
    }
  }

  async function onPick(event: Event): Promise<void> {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    // Le champ est remis à zéro tout de suite : sans cela, redéposer le même fichier
    // après un refus ne déclencherait aucun `change`.
    if (input) input.value = '';
    if (!file) return;

    confirmingRemoval = false;
    busy = true;
    error = null;
    let prepared: Awaited<ReturnType<typeof preparePhoto>>;
    try {
      prepared = await preparePhoto(file);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Ce fichier n'est pas une image lisible.";
      busy = false;
      return;
    }
    busy = false;

    const form = new FormData();
    form.set('action', 'photo');
    form.set('file', prepared.blob, prepared.fileName);
    await send(form);
  }

  async function remove(): Promise<void> {
    confirmingRemoval = false;
    const form = new FormData();
    form.set('action', 'delete-photo');
    await send(form);
  }
</script>

<!--
  La pastille EST la commande.

  Une rangée « Ajouter / Changer la photo » sous l'identité coûtait une ligne entière sur
  chaque fiche, pour un geste qu'on attend de toute façon sur l'image elle-même. Le survol
  ne suffit pas à l'annoncer — un téléphone ne survole rien — d'où la pastille d'appareil
  photo épinglée en permanence dès qu'on a le droit de modifier.
-->
<div class="space-y-2">
  <div class="flex items-center gap-4">
    {#snippet avatar()}
      <Avatar.Root class="h-full w-full rounded-full">
        {#if src}
          <Avatar.Image {src} alt="" class="h-full w-full rounded-full object-cover" />
        {/if}
        <Avatar.Fallback
          class="bg-primary/10 text-primary flex h-full w-full items-center justify-center rounded-full font-semibold"
        >
          {initials}
        </Avatar.Fallback>
      </Avatar.Root>
    {/snippet}

    <div class="relative shrink-0" style={`width:${size}px;height:${size}px`}>
      {#if canEdit}
        <button
          type="button"
          class="group focus-visible:ring-ring block h-full w-full cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait"
          disabled={busy}
          aria-label={currentVersion ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
          onclick={() => input?.click()}
        >
          {@render avatar()}
          <span
            class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          >
            <Camera class="size-5" />
          </span>
        </button>
        <!-- Repère permanent : c'est lui qui dit « ceci se change » là où il n'y a pas de survol.
             Décoratif — le clic est porté par la pastille entière, qu'il recouvre. -->
        <span
          class="bg-primary text-primary-foreground border-background pointer-events-none absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2"
          aria-hidden="true"
        >
          <Camera class="size-3" />
        </span>

        <!-- Le retrait vit sur la pastille lui aussi, à l'opposé du dépôt : deux gestes
             distincts, aucune ligne de commandes à porter sous l'identité. -->
        {#if currentVersion && !busy}
          <button
            type="button"
            class="bg-destructive border-background focus-visible:ring-ring absolute -top-1 -right-1 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 text-white focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Retirer la photo de profil"
            onclick={() => {
              confirmingRemoval = true;
            }}
          >
            <Trash2 class="size-3" />
          </button>
        {/if}
      {:else}
        {@render avatar()}
      {/if}
    </div>

    <!-- L'identité tient compagnie à la pastille : c'est la seule chose qui doit être
         à sa hauteur, et elle dispose alors de toute la largeur restante. Posée à côté des
         anciennes commandes, elle se retrouvait dans une colonne de quelques dizaines de
         pixels sur téléphone, et le nom descendait lettre par lettre. -->
    {#if identity}
      <div class="min-w-0 flex-1">{@render identity()}</div>
    {/if}
  </div>

  {#if canEdit}
    <input
      bind:this={input}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif"
      class="hidden"
      onchange={onPick}
    />

    {#if busy}
      <p class="text-muted-foreground text-xs">Envoi en cours…</p>
    {/if}

    <!--
      Confirmation posée dans le composant, et non par `uiConfirm` : l'espace adhérent
      ne monte ni `GlobalConfirm` ni `Toaster`, et une photo de profil se gère des deux
      côtés avec le même composant.
    -->
    {#if confirmingRemoval}
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-muted-foreground">Retirer définitivement cette photo ?</span>
        <Button size="sm" variant="destructive" disabled={busy} onclick={remove}>Retirer</Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onclick={() => {
            confirmingRemoval = false;
          }}
        >
          Annuler
        </Button>
      </div>
    {/if}

    {#if error}
      <ErrorAlert message={error} />
    {/if}
  {/if}
</div>
