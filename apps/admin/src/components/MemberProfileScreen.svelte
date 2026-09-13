<script lang="ts">
  import { poserTitre } from '../lib/identite';
  import { ErrorAlert } from '@nba/ui';
  import { MemberProfile } from '@nba/members-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * La fiche d'un adhérent.
   *
   * Le titre de l'onglet porte son nom, qui n'est connu qu'une fois la fiche chargée :
   * il est posé à l'arrivée des données, comme pour l'éditeur de pages.
   */
  let {
    licence,
    season = ''
  }: { licence: string; season?: string } = $props();

  let errorMsg = $state<string | null>(null);

  function recevoir(d: Record<string, any>) {
    errorMsg = d.errorMsg ?? null;
    if (d.member) poserTitre(`Profil ${d.member.lastName} ${d.member.firstName}`);
  }
</script>

<EcranDistant
  domaine="members"
  ecran="fiche"
  variante="formulaire"
  parametres={{ licence, season }}
  onDonnees={recevoir}
>
  {#snippet pret(d)}
    {#if d.member}
      <MemberProfile
        member={d.member}
        transactions={d.transactions}
        seasonId={d.season}
        clubFunctions={d.clubFunctions}
        canWrite={d.canWrite}
      />
    {:else}
      <div class="mx-auto max-w-3xl space-y-4">
        <ErrorAlert message={errorMsg ?? 'Adhérent introuvable.'} />
        <a href="/admin/members" class="text-primary text-sm hover:underline">
          &larr; Retour à la liste des adhérents
        </a>
      </div>
    {/if}
  {/snippet}
</EcranDistant>
