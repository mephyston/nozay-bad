<script lang="ts">
  import { Button, uiConfirm } from '@nba/ui';

  /**
   * Le geste qui remplace la recherche de bénévole par SMS.
   *
   * Rendu seulement aux détenteurs de badge — mais ce n'est qu'un confort d'affichage :
   * le refus qui compte est celui du serveur, qui vérifie la licence de la session contre
   * la liste des ouvreurs. Un navigateur qui forgerait la requête se ferait refuser.
   *
   * Comme l'îlot d'inscription, il ignore l'identité : la page qui le porte la tient.
   */
  let {
    sessionId,
    /** Nom de l'ouvreur en place, ou `null` si la séance cherche encore preneur. */
    openerName = null,
    /** Suis-je celui qui la tient ? Décide entre s'engager et se rétracter. */
    iAmOpener = false,
    /** Le seuil est atteint et personne ne s'est déclaré : l'appel est pressant. */
    needsOpener = false,
    endpoint = ''
  } = $props<{
    sessionId: number;
    openerName?: string | null;
    iAmOpener?: boolean;
    needsOpener?: boolean;
    endpoint?: string;
  }>();

  let busy = $state(false);
  let errorMsg = $state('');

  async function send(action: 'claim' | 'release') {
    if (action === 'release') {
      const confirmed = await uiConfirm({
        title: 'Ne plus ouvrir cette séance ?',
        description:
          'Des adhérents comptent sur vous. La séance repartira à la recherche d’un bénévole.',
        confirmLabel: 'Je ne peux plus',
        destructive: true
      });
      if (!confirmed) return;
    }

    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionId })
      });

      if (!response.ok) {
        let message = "L'opération a échoué.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* message générique */
        }
        throw new Error(message);
      }

      // Rechargement : l'état de la séance a changé pour tout le monde, pas seulement
      // pour le bouton.
      window.location.reload();
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : "L'opération a échoué.";
      busy = false;
    }
  }
</script>

<div class="mt-2">
  {#if iAmOpener}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-primary">C'est vous qui ouvrez cette séance.</p>
      <Button variant="outline" onclick={() => send('release')} disabled={busy} class="min-h-[44px]">
        {busy ? 'Un instant…' : 'Je ne peux plus ouvrir'}
      </Button>
    </div>
  {:else if openerName}
    <p class="text-sm text-muted-foreground">{openerName} ouvre cette séance.</p>
  {:else}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted-foreground">
        {needsOpener
          ? 'Assez de joueurs, mais personne pour ouvrir.'
          : 'Cette séance cherche encore un ouvreur.'}
      </p>
      <Button onclick={() => send('claim')} disabled={busy} class="min-h-[44px] font-bold">
        {busy ? 'Un instant…' : "J'ouvre ce créneau"}
      </Button>
    </div>
  {/if}

  {#if errorMsg}
    <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
  {/if}
</div>
