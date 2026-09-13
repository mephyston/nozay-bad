<script lang="ts">
  import { PageHeader, Badge } from '@nba/ui';
  import { AccountManager } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Un compte sans relevé, en coquille.
   *
   * Le code du compte vient de l'URL de la page, la saison de sa chaîne de requête : les
   * deux partent au relais en paramètres, comme pour un rapport. Le sélecteur de saison
   * navigue, la page se re-rend, les paramètres suivent.
   */
  let { code, season = '' }: { code: string; season?: string } = $props();

  let label = $state('');
  let thirdParty = $state(false);
  let seasonName = $state('');
  let isClosed = $state(false);

  const description = $derived(
    thirdParty
      ? "Fonds reçus pour le compte d'adhérents, à leur rendre sur Badnet. Une dette, pas de la trésorerie : jamais au résultat."
      : 'Compte sans relevé bancaire : ses mouvements se saisissent ici, à la main, et son solde se contrôle contre la réalité.'
  );
</script>

<PageHeader
  title={label || 'Compte'}
  description={`${description}${seasonName ? ` Saison ${seasonName}.` : ''}`}
  class="print:hidden"
>
  {#snippet actions()}
    {#if isClosed}
      <Badge variant="outline" size="lg">Saison clôturée (Lecture seule)</Badge>
    {/if}
  {/snippet}
</PageHeader>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="account"
    variante="liste"
    parametres={{ season, account: code }}
    onDonnees={(d) => {
      label = d.account?.label ?? '';
      thirdParty = Boolean(d.account?.thirdParty);
      seasonName = d.seasonName ?? '';
      isClosed = Boolean(d.isClosed);
    }}
  >
    {#snippet pret(d)}
      <AccountManager
        account={d.account}
        accounts={d.accounts}
        categories={d.categories}
        initialBalance={d.initialBalance}
        transactions={d.transactions}
        memberAdvanceEntries={d.memberAdvanceEntries}
        paymentMethods={d.paymentMethods ?? []}
        seasonId={d.seasonId}
        seasons={d.seasons}
        canWrite={d.canWrite}
        canDelete={d.canDelete}
      />
    {/snippet}
  </EcranDistant>
</div>
