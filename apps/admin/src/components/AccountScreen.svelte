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
  let kind = $state('');
  let thirdParty = $state(false);
  let seasonName = $state('');
  let isClosed = $state(false);

  /*
   * Ce qu'est ce compte, dit par sa nature : un porte-monnaie chez une plateforme et un
   * compte de bons ne se tiennent pas de la même façon, et l'écran doit le dire d'emblée.
   */
  const DESCRIPTIONS: Record<string, string> = {
    third_party: "Fonds reçus pour le compte d'adhérents, à leur rendre sur leur porte-monnaie. Une dette, pas de la trésorerie : jamais au résultat.",
    cash: 'Les espèces en main — cotisations, buvette, tournois. Ses mouvements se saisissent ici, et son solde se contrôle contre le contenu de la caisse.',
    wallet: "Le porte-monnaie du club chez une plateforme : rechargé depuis la banque, débité par les inscriptions, rapatrié après un tournoi. Son solde se contrôle contre l'écran de la plateforme.",
    voucher: "Les paiements par code, QR code ou chèque validés chez l'organisme, en attendant qu'il rembourse le club. Le solde est ce qu'il doit encore ; le club n'y verse rien et ne paie rien avec."
  };
  const description = $derived(
    DESCRIPTIONS[thirdParty ? 'third_party' : kind] ??
      'Compte sans relevé bancaire : ses mouvements se saisissent ici, à la main, et son solde se contrôle contre la réalité.'
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
      kind = d.account?.kind ?? '';
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
        members={d.members ?? []}
        seasonId={d.seasonId}
        seasons={d.seasons}
        canWrite={d.canWrite}
        canDelete={d.canDelete}
      />
    {/snippet}
  </EcranDistant>
</div>
