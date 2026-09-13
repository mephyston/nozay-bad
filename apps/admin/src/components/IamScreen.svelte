<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { UsersManager, RolesMatrix } from '@nba/iam-ui';
  import EcranDistant from './EcranDistant.svelte';

  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  title="Accès et rôles"
  description="Attribuez un rôle aux personnes qui administrent le club."
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
      <div class="space-y-6">
        <div>
          <UsersManager users={d.users} />
        </div>
        <div>
          <RolesMatrix roles={d.roles} canEdit={d.canEditRoles} />
        </div>
      </div>
    {/snippet}
  </EcranDistant>
</div>
