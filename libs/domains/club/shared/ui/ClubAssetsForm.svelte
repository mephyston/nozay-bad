<script lang="ts">
  import { Trash2, Upload, Loader2 } from '@lucide/svelte';
  import { Button, Card, ErrorAlert, flashAndReload, readApiError, uiConfirm } from '@nba/ui';
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
    settings,
    mediaOrigin = '',
    canWrite = false,
    maxPartners = 6,
    endpoint = '/admin/api/club'
  } = $props<{
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

{#if errorMsg}
  <div class="mb-4"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="space-y-6">
  {#each CLUB_ASSETS as asset (asset)}
    {@const src = url(settings[asset === 'logo' ? 'logoKey' : asset === 'letterheadHeader' ? 'letterheadHeaderKey' : asset === 'letterheadFooter' ? 'letterheadFooterKey' : 'stampKey'])}
    <Card.Root>
      <Card.Header>
        <Card.Title>{LABELS[asset].title}</Card.Title>
        <Card.Description>{LABELS[asset].help} PNG ou JPEG, 2 Mo au plus.</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-wrap items-center gap-6">
        <div class="flex h-24 min-w-24 max-w-full items-center justify-center rounded-md border border-border bg-background p-2">
          {#if src}
            <img {src} alt={LABELS[asset].title} class="max-h-20 max-w-[320px] object-contain" />
          {:else}
            <span class="text-xs text-muted-foreground">Aucune image</span>
          {/if}
        </div>
        {#if canWrite}
          <div class="flex flex-wrap items-center gap-2">
            <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
              {#if busy === `asset-${asset}`}
                <Loader2 class="h-4 w-4 animate-spin" />
              {:else}
                <Upload class="h-4 w-4" />
              {/if}
              <span>{src ? 'Remplacer' : 'Déposer'}</span>
              <input type="file" accept="image/png,image/jpeg" class="sr-only" disabled={busy !== null} onchange={onFile(`asset-${asset}`, LABELS[asset].title)} />
            </label>
            {#if src}
              <Button variant="outline" size="sm" disabled={busy !== null} onclick={() => retirer(asset)} class="gap-1.5">
                <Trash2 class="h-4 w-4" /> Retirer
              </Button>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/each}

  <Card.Root>
    <Card.Header>
      <Card.Title>Logos des partenaires</Card.Title>
      <Card.Description>Imprimés en bas de chaque document, dans l’ordre. {maxPartners} au plus, PNG ou JPEG.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if settings.partnerLogoKeys.length === 0}
        <p class="text-sm text-muted-foreground">Aucun logo partenaire.</p>
      {:else}
        <ul class="flex flex-wrap gap-4">
          {#each settings.partnerLogoKeys as key (key)}
            <li class="flex flex-col items-center gap-2">
              <div class="flex h-20 w-32 items-center justify-center rounded-md border border-border bg-background p-2">
                <img src={url(key)} alt="Logo partenaire" class="max-h-16 max-w-full object-contain" />
              </div>
              {#if canWrite}
                <Button variant="ghost" size="sm" disabled={busy !== null} onclick={() => retirerPartenaire(key)} class="gap-1 text-xs">
                  <Trash2 class="h-3.5 w-3.5" /> Retirer
                </Button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if canWrite && settings.partnerLogoKeys.length < maxPartners}
        <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
          {#if busy === 'asset-partners'}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <Upload class="h-4 w-4" />
          {/if}
          <span>Ajouter un logo</span>
          <input type="file" accept="image/png,image/jpeg" class="sr-only" disabled={busy !== null} onchange={onFile('asset-partners', 'Logo partenaire')} />
        </label>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
