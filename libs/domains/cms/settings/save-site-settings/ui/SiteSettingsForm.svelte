<script lang="ts">
  import { Save, Loader2 } from '@lucide/svelte';
  import { Button, Input, Textarea, Card, FormField, ErrorAlert, submitForm } from '@nba/ui';

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
        if (!res.ok) throw new Error((await res.text()) || "L'enregistrement a échoué.");
      },
      success: 'Pied de page enregistré. Le site est à jour.',
      onError: (message) => {
        errorMsg = message;
      }
    });

    busy = false;
  }
</script>

<form onsubmit={save}>
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
          placeholder="Plus qu'une Tribu !"
        />
      </FormField>

      <FormField id="footer-address" label="Adresse">
        <Textarea
          id="footer-address"
          bind:value={address}
          maxlength={200}
          rows={2}
          disabled={!canWrite}
          placeholder="Place de la Mairie, 91620 Nozay"
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
          placeholder="https://www.instagram.com/nozaybad/"
        />
      </FormField>

      <FormField id="footer-facebook" label="Facebook">
        <Input
          id="footer-facebook"
          bind:value={facebook}
          maxlength={500}
          disabled={!canWrite}
          placeholder="https://www.facebook.com/nozaybad/"
        />
      </FormField>
    </Card.Content>
  </Card.Root>

  {#if canWrite}
    <div class="mt-6 flex justify-end">
      <Button type="submit" disabled={busy} class="gap-1.5 font-bold">
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
