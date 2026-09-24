<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { RolesMatrix } from '@nba/iam-ui';
  import EcranDistant from './EcranDistant.svelte';

  /** Ce que permet chaque rôle. Les comptes vivent sur leur propre page. */
  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  retour={{ href: '/admin/iam', libelle: 'Retour aux accès et rôles' }}
  title="Rôles"
  description="Ce que chaque rôle permet. Un compte peut en cumuler plusieurs ; ses droits sont la réunion des leurs."
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
      <RolesMatrix roles={d.roles} canEdit={d.canEditRoles} />
    {/snippet}
  </EcranDistant>
</div>
