<script lang="ts">
  import { FileSignature } from '@lucide/svelte';
  import {
    FormField,
    FormSheet,
    Input,
    MediaField,
    readApiError,
    submitForm
  } from '@nba/ui';
  import {
    FORMATS,
    formatAccepte,
    messageDeReduction,
    reduireSignature
  } from './signature-image';

  /**
   * Le signataire des attestations CSE, et sa signature.
   *
   * L'écran était une page à part, en JavaScript natif : deux formulaires câblés à la
   * main, deux boutons d'enregistrement, et des messages d'état posés dans des `<span>`
   * par `textContent`. Rien n'y suivait les conventions du reste de l'application — ni
   * les champs, ni le dépôt d'image, ni la façon de dire un refus.
   *
   * Un seul geste de validation : l'identité **et** la signature partent ensemble. Elles
   * voyageaient séparément, et l'on pouvait repartir en croyant avoir tout enregistré
   * alors que seule la moitié l'était.
   */
  let {
    open = $bindable(false),
    onOpenChange,
    config,
    plafondOctets,
    canWrite = false,
    endpoint = '/admin/api/members/attestation'
  }: {
    open?: boolean;
    onOpenChange?: (ouvert: boolean) => void;
    config: {
      signatoryName: string;
      signatoryEmail: string;
      websiteUrl: string;
      signature: { dataUrl: string | null };
    };
    /** Plafond du serveur, jamais recopié : deux chiffres à tenir en accord divergent. */
    plafondOctets: number;
    canWrite?: boolean;
    endpoint?: string;
  } = $props();

  let signatoryName = $state(config.signatoryName ?? '');
  let signatoryEmail = $state(config.signatoryEmail ?? '');
  let websiteUrl = $state(config.websiteUrl ?? '');

  /** La signature déjà en place, ou celle qu'on vient de préparer. */
  let apercu = $state<string | null>(config.signature?.dataUrl ?? null);
  /** Non nulle quand une nouvelle image attend d'être envoyée avec le reste. */
  let signatureEnAttente = $state<string | null>(null);
  let messageImage = $state('');

  let busy = $state(false);
  let errorMsg = $state('');

  const plafondKo = $derived(Math.round(plafondOctets / 1024));

  async function preparer(fichier: File) {
    errorMsg = '';
    messageImage = '';
    if (!formatAccepte(fichier.type)) {
      errorMsg = 'Format PNG ou JPEG requis.';
      return;
    }
    busy = true;
    try {
      const reduite = await reduireSignature(fichier, plafondOctets);
      if (!reduite) {
        errorMsg = `Image trop chargée pour être réduite sous ${plafondKo} Ko. Recadrez-la sur la signature seule.`;
        return;
      }
      signatureEnAttente = reduite.dataUrl;
      apercu = reduite.dataUrl;
      messageImage = messageDeReduction(fichier.size, reduite.octets);
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Image illisible.';
    } finally {
      busy = false;
    }
  }

  async function poster(corps: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps)
    });
    if (!res.ok) throw new Error(await readApiError(res, "L'enregistrement a échoué."));
  }

  async function save(event: Event) {
    event.preventDefault();
    errorMsg = '';
    busy = true;

    await submitForm({
      validate: () => {
        if (!signatoryName.trim()) return 'Le nom du signataire est obligatoire.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatoryEmail.trim()))
          return "L'adresse mail du signataire n'est pas valide.";
        if (!websiteUrl.trim()) return 'Le site web est obligatoire.';
        return null;
      },
      submit: async () => {
        await poster({
          action: 'update_info',
          signatoryName: signatoryName.trim(),
          signatoryEmail: signatoryEmail.trim(),
          websiteUrl: websiteUrl.trim()
        });
        // La signature suit dans le même geste : deux envois, un seul acte pour qui valide.
        if (signatureEnAttente) {
          await poster({ action: 'upload_signature', signature: signatureEnAttente });
        }
      },
      close: () => (open = false),
      success: 'Attestation mise à jour.',
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }
</script>

<FormSheet
  bind:open
  {onOpenChange}
  title="Attestation CSE"
  description="Le signataire et la signature qui apparaissent sur les attestations générées."
  icon={FileSignature}
  size="lg"
  error={errorMsg}
  isSubmitting={busy}
  lectureSeule={!canWrite}
  cancelLabel="Fermer"
  onSubmit={save}
>
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id="attestation-nom" label="Nom du signataire">
      <Input
        id="attestation-nom"
        bind:value={signatoryName}
        maxlength={120}
        disabled={!canWrite}
        placeholder="Prénom NOM"
      />
    </FormField>

    <FormField id="attestation-mail" label="Adresse mail">
      <Input
        id="attestation-mail"
        type="email"
        inputmode="email"
        autocapitalize="off"
        bind:value={signatoryEmail}
        maxlength={200}
        disabled={!canWrite}
      />
    </FormField>

    <div class="sm:col-span-2">
      <FormField id="attestation-site" label="Site web">
        <Input
          id="attestation-site"
          type="url"
          inputmode="url"
          autocapitalize="off"
          bind:value={websiteUrl}
          maxlength={200}
          disabled={!canWrite}
        />
      </FormField>
    </div>

    <div class="sm:col-span-2">
      <!--
        La même rangée que l'image d'un produit. L'image est réduite ici même, avant
        l'envoi : une signature s'imprime sur quatre centimètres, et les pixels
        au-delà n'alourdissent que le PDF de chaque adhérent.
      -->
      <FormField
        id="attestation-signature"
        label="Signature"
        hint={messageImage ||
          `PNG ou JPEG. Le PNG est préférable : il garde la transparence, là où le JPEG pose un rectangle blanc. Réduite automatiquement sous ${plafondKo} Ko.`}
      >
        <MediaField
          id="attestation-signature"
          label="Signature"
          accept={FORMATS}
          max={1}
          preview={apercu ? [apercu] : null}
          names={apercu ? ['Signature'] : undefined}
          disabled={!canWrite || busy}
          onSelect={(file) => void preparer(file)}
          onClear={() => {
            apercu = null;
            signatureEnAttente = null;
            messageImage = '';
          }}
        />
      </FormField>
    </div>
  </div>
</FormSheet>
