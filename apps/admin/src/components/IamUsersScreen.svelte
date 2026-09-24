<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { UsersManager } from '@nba/iam-ui';
  import EcranDistant from './EcranDistant.svelte';

  /** Les comptes d'administration. La matrice des droits vit sur sa propre page. */
  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  retour={{ href: '/admin/iam', libelle: 'Retour aux accès et rôles' }}
  title="Utilisateurs"
  description="Qui administre le club, et avec quels rôles."
/>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <EcranDistant
    domaine="iam"
    ecran="acces"
    variante="liste"
    onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
  >
    {#snippet pret(d)}
      <UsersManager users={d.users} />
    {/snippet}
  </EcranDistant>
</div>
