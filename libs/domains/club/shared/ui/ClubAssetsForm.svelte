<script lang="ts">
  import { Trash2, Upload, Loader2 } from '@lucide/svelte';
  import { Images } from '@lucide/svelte';
  import { FormField, FormSheet, MediaField, flashAndReload, readApiError, uiConfirm } from '@nba/ui';
  import { CLUB_ASSETS, type ClubAsset, type ClubSettings } from '../settings';
  import { clubAssetPath } from '../assets';

  /**
   * Les images du club : logo, papier à lettre, tampon, logos partenaires.
   *
   * Chaque image se dépose ou se retire indépendamment, et l'écran se recharge
   * ensuite : ce sont des écritures unitaires, pas un formulaire — un dépôt réussi ne
   * doit pas attendre un bouton « Enregistrer » qu'on oublierait.
   *
   * Les octets sont servis par le site public (`/media/…`), jamais par
   * l'administration : d'où `mediaOrigin`, l'adresse du site, passée par l'écran.
   */
  let {
    open = $bindable(false),
    onOpenChange,
    settings,
    mediaOrigin = '',
    canWrite = false,
    maxPartners = 6,
    endpoint = '/admin/api/club'
  } = $props<{
    /** Le formulaire est un tiroir. Rien à soumettre : chaque dépôt écrit aussitôt. */
    open?: boolean;
    /**
     * Prévenu de chaque fermeture, celles que la feuille décide comprises.
     *
     * Le hub garde la section ouverte dans l'adresse : sans cela, refermer d'un
     * glissement ou de la touche d'échappement laisserait `?section=` derrière, et le
     * tiroir se rouvrirait au prochain passage.
     */
    onOpenChange?: (ouvert: boolean) => void;
    settings: ClubSettings;
    mediaOrigin?: string;
    canWrite?: boolean;
    maxPartners?: number;
    /** Préfixe du relais : chaque image a son écran de dépôt, `${endpoint}/asset-<nom>`. */
    endpoint?: string;
  }>();

  const LABELS: Record<ClubAsset, { title: string; help: string }> = {
    logo: { title: 'Logo', help: 'Carré de préférence, fond transparent (PNG). Menu des applications, en-tête des documents sans bande.' },
    letterheadHeader: { title: 'Bande d’en-tête des documents', help: 'Image large, à fond perdu, en haut de chaque page PDF. Sans elle, l’en-tête est composé du logo et du nom.' },
    letterheadFooter: { title: 'Bas de page des documents', help: 'Image large, posée au-dessus des mentions légales. Facultatif.' },
    stamp: { title: 'Tampon', help: 'Apposé sur les factures acquittées et les attestations. Facultatif.' }
  };

  let busy = $state<string | null>(null);
  let errorMsg = $state('');

  function url(key: string | null): string | null {
    return key ? `${mediaOrigin}${clubAssetPath(key)}` : null;
  }

  async function deposer(ecran: string, file: File, quoi: string) {
    busy = ecran;
    errorMsg = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${endpoint}/${ecran}`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await readApiError(res, 'Le dépôt a échoué.'));
      flashAndReload(`${quoi} : image déposée.`);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      busy = null;
    }
  }

  async function retirer(asset: ClubAsset) {
    const ok = await uiConfirm({
      title: `Retirer ${LABELS[asset].title.toLowerCase()} ?`,
      description: 'Les documents générés ensuite s’imprimeront sans cette image.',
      confirmLabel: 'Retirer',
      destructive: true
    });
    if (!ok) return;
    busy = asset;
    errorMsg = '';
    try {
      const res = await fetch(`${endpoint}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_asset', asset })
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Le retrait a échoué.'));
      flashAndReload(`${LABELS[asset].title} : image retirée.`);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      busy = null;
    }
  }

  async function retirerPartenaire(key: string) {
    busy = key;
    errorMsg = '';
    try {
      const keys = settings.partnerLogoKeys.filter((k) => k !== key);
      const res = await fetch(`${endpoint}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_partners', keys })
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Le retrait a échoué.'));
      flashAndReload('Logo partenaire retiré.');
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      busy = null;
    }
  }

  function onFile(ecran: string, quoi: string) {
    return (event: Event) => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      if (file) void deposer(ecran, file, quoi);
      input.value = '';
    };
  }
</script>

<!--
  Rien à soumettre : chaque dépôt écrit aussitôt et recharge. Le tiroir n'a donc pas de
  validation — `lectureSeule` — et la croix en est la seule sortie.
-->
<FormSheet
  bind:open
  {onOpenChange}
  title="Images des documents"
  description="Logo, papier à lettre, tampon et logos partenaires imprimés sur les PDF. PNG ou JPEG, 2 Mo au plus."
  icon={Images}
  size="lg"
  error={errorMsg}
  isSubmitting={busy !== null}
  lectureSeule
  cancelLabel="Fermer"
  onSubmit={(e) => e.preventDefault()}
>
  <div class="space-y-4">
    {#each CLUB_ASSETS as asset (asset)}
      {@const src = url(settings[asset === 'logo' ? 'logoKey' : asset === 'letterheadHeader' ? 'letterheadHeaderKey' : asset === 'letterheadFooter' ? 'letterheadFooterKey' : 'stampKey'])}
      <!--
        La même rangée que l'image d'un produit : appui pour choisir, puis l'image sur
        sa propre ligne avec la pastille de retrait. Un seul fichier par emplacement,
        d'où `max={1}` — la rangée dit « Remplacer » et non « Ajouter ».
      -->
      <FormField id={`asset-${asset}`} label={LABELS[asset].title} hint={LABELS[asset].help}>
        <MediaField
          id={`asset-${asset}`}
          label={LABELS[asset].title}
          accept="image/png,image/jpeg"
          max={1}
          preview={src ? [src] : null}
          names={src ? [LABELS[asset].title] : undefined}
          disabled={!canWrite || busy !== null}
          onSelect={(file) => void deposer(`asset-${asset}`, file, LABELS[asset].title)}
          onClear={() => retirer(asset)}
        />
      </FormField>
    {/each}

    <FormField
      id="asset-partners"
      label="Logos des partenaires"
      hint={`Imprimés en bas de chaque document, dans l’ordre. ${maxPartners} au plus.`}
    >
      <MediaField
        id="asset-partners"
        label="Logos des partenaires"
        accept="image/png,image/jpeg"
        max={maxPartners}
        preview={settings.partnerLogoKeys.map((key: string) => url(key))}
        names={settings.partnerLogoKeys.map(() => 'Logo partenaire')}
        disabled={!canWrite || busy !== null}
        onSelect={(file) => void deposer('asset-partners', file, 'Logo partenaire')}
        onClear={(index) => retirerPartenaire(settings.partnerLogoKeys[index])}
      />
    </FormField>
  </div>
</FormSheet>
