<script lang="ts">
  import { Save, Loader2 } from '@lucide/svelte';
  import { Button, Input, Textarea, Card, FormField, ErrorAlert, dockDePage, submitForm, readApiError } from '@nba/ui';

  /**
   * Réglages du pied de page du site public.
   *
   * Un formulaire posé à plat, sans `FormSheet` : ce ne sont pas des éléments d'une
   * liste que l'on crée et supprime, mais quatre valeurs uniques que l'on relit et
   * corrige. Le tiroir imposerait un clic pour voir ce qui est en place.
   */
  let {
    footerDescription = '',
    footerAddress = '',
    instagramUrl = '',
    facebookUrl = '',
    canWrite = false,
    endpoint = '/admin/api/cms/footer'
  } = $props<{
    footerDescription?: string;
    footerAddress?: string;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    canWrite?: boolean;
    /**
     * Destination des écritures : le relais de la rubrique, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let description = $state(footerDescription);
  let address = $state(footerAddress);
  let instagram = $state(instagramUrl ?? '');
  let facebook = $state(facebookUrl ?? '');
  let busy = $state(false);
  let errorMsg = $state('');

  /** Même règle que côté API : vide = réseau retiré, sinon un lien web valable. */
  function invalidUrl(value: string, network: string): string | null {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    return /^https?:\/\//i.test(trimmed)
      ? null
      : `L'adresse ${network} doit commencer par http:// ou https://.`;
  }

  /*
    Ce qui a changé depuis ce que l'écran a reçu. Rien ne signalait l'état non
    enregistré : on quittait la page en croyant l'avoir fait, ou l'on réécrivait le
    pied du site public avec des valeurs intactes.

    La comparaison porte sur les propriétés elles-mêmes, et non sur une copie prise au
    montage : Svelte avertit qu'une telle copie ne suivrait pas une propriété qui
    change, et ici la suivre est ce qu'on veut.
  */
  const modifie = $derived(
    description !== footerDescription ||
      address !== footerAddress ||
      instagram !== (instagramUrl ?? '') ||
      facebook !== (facebookUrl ?? '')
  );

  /*
    Enregistrer descend dans la barre du bas. Le bouton vivait à la fin du flux, sous
    le pli : sur un téléphone, on ne le voyait qu'après avoir fait défiler les deux
    cartes, et rien ne disait qu'il restait quelque chose à faire.
  */
  let formulaire = $state<HTMLFormElement | null>(null);

  $effect(() => {
    if (!canWrite || !modifie) return;
    return dockDePage.declarerActions(
      [
        {
          id: 'enregistrer',
          label: 'Enregistrer le pied de page',
          icon: Save,
          run: () => formulaire?.requestSubmit()
        }
      ],
      { icon: Save, label: 'Enregistrer' }
    );
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    errorMsg = '';

    await submitForm({
      validate: () => invalidUrl(instagram, 'Instagram') ?? invalidUrl(facebook, 'Facebook'),
      submit: async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            footerDescription: description,
            footerAddress: address,
            instagramUrl: instagram,
            facebookUrl: facebook
          })
        });
        if (!res.ok) throw new Error(await readApiError(res, "L'enregistrement a échoué."));
      },
      success: 'Pied de page enregistré. Le site est à jour.',
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }
</script>

<form bind:this={formulaire} onsubmit={save}>
  <Card.Root>
    <Card.Header>
      <Card.Title>Identité du club</Card.Title>
      <Card.Description>
        Affichées dans la première colonne du pied de page, sous le nom du club.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if errorMsg}
        <ErrorAlert message={errorMsg} />
      {/if}

      <FormField id="footer-description" label="Phrase de présentation">
        <Input
          id="footer-description"
          bind:value={description}
          maxlength={200}
          disabled={!canWrite}
          placeholder="Le slogan du club"
        />
      </FormField>

      <FormField id="footer-address" label="Adresse">
        <Textarea
          id="footer-address"
          bind:value={address}
          maxlength={200}
          rows={2}
          disabled={!canWrite}
          placeholder="Adresse du siège"
        />
      </FormField>
    </Card.Content>
  </Card.Root>

  <Card.Root class="mt-6">
    <Card.Header>
      <Card.Title>Réseaux sociaux</Card.Title>
      <Card.Description>
        Un champ vidé retire l'icône du pied de page. Ces adresses servent aussi aux
        moteurs de recherche, pour rattacher les comptes du club à son site.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Pas d'icône de marque : @lucide/svelte n'expose plus les logos de réseaux,
           et l'intitulé du champ dit déjà de quel compte il s'agit. -->
      <FormField id="footer-instagram" label="Instagram">
        <Input
          id="footer-instagram"
          bind:value={instagram}
          maxlength={500}
          disabled={!canWrite}
          placeholder="https://www.instagram.com/…"
        />
      </FormField>

      <FormField id="footer-facebook" label="Facebook">
        <Input
          id="footer-facebook"
          bind:value={facebook}
          maxlength={500}
          disabled={!canWrite}
          placeholder="https://www.facebook.com/…"
        />
      </FormField>
    </Card.Content>
  </Card.Root>

  {#if canWrite}
    <!-- Le bouton reste à la souris ; sur téléphone il vit dans la barre du bas.
         Désactivé tant que rien n'a bougé : enregistrer une valeur intacte réécrit le
         pied du site public pour rien. -->
    <div class="mt-6 flex items-center justify-end gap-3">
      {#if modifie}
        <span class="text-xs text-muted-foreground">Modifications non enregistrées</span>
      {/if}
      <Button type="submit" disabled={busy || !modifie} class="hidden gap-1.5 font-bold md:inline-flex">
        {#if busy}
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>Enregistrement…</span>
        {:else}
          <Save class="h-4 w-4" />
          <span>Enregistrer</span>
        {/if}
      </Button>
    </div>
  {/if}
</form>
